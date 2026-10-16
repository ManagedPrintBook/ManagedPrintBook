#!/usr/bin/env python3
"""Meter reading agent for Kyocera and Epson network printers.

Runs on ONE always-on PC at the customer site (or your office, if it can reach the printers).
It reads the printers over SNMP, matches each machine by serial number, and sends the counters
to your Managed Print portal Inbox. Nothing is saved to a customer's account until you press
Accept in the app (Customers -> Customer Portal -> Inbox).

Needs: Python 3.8+ and net-snmp command-line tools (snmpget / snmpwalk).
  Windows: install "Net-SNMP"   Ubuntu: sudo apt install snmp
Usage:
  python meter_agent.py --discover 192.168.1.50      # list counters so you can verify them
  python meter_agent.py --config config.json --dry-run
  python meter_agent.py --config config.json         # send readings
Schedule it monthly (Windows Task Scheduler / cron).
"""
import argparse, json, subprocess, sys, datetime, os, urllib.request

SERIAL_OID = "1.3.6.1.2.1.43.5.1.1.17.1"      # Printer-MIB prtGeneralSerialNumber
TOTAL_OID  = "1.3.6.1.2.1.43.10.2.1.4.1.1"    # Printer-MIB prtMarkerLifeCount (all pages)
# Kyocera: separate print/copy counters for black-and-white (.1) and full colour (.3).
# Taken from a published report for a TASKalfa 4009ci - VERIFY on your models with --discover.
KY = "1.3.6.1.4.1.1347.42.3.1.2.1.1"
PROFILES = {
    "kyocera": {"mono": [KY + ".1.1", KY + ".2.1"], "color": [KY + ".1.3", KY + ".2.3"]},
    # Epson: no verified colour/black OIDs. Set mono_oids / color_oids per printer in config.json
    # (use --discover), or set "total_only": true to send the total page count as mono.
    "epson": {"mono": [], "color": []},
}

def snmp(tool, ip, community, oid, extra=()):
    cmd = [tool, "-v2c", "-c", community, "-t", "3", "-r", "1", *extra, ip, oid]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip() or "SNMP failed")
    return r.stdout

def get(ip, community, oid):
    out = snmp("snmpget", ip, community, oid, ("-Oqv",)).strip().strip('"')
    if "No Such" in out or out == "":
        raise RuntimeError("no value for " + oid)
    return out

def get_int(ip, community, oid):
    return int("".join(ch for ch in get(ip, community, oid).split()[0] if ch.isdigit()) or "0")

def discover(ip, community):
    print("Serial:", get(ip, community, SERIAL_OID) if True else "")
    for base in ("1.3.6.1.2.1.43.10.2.1", "1.3.6.1.4.1.1347.42.3", "1.3.6.1.4.1.1248"):
        print("\n== walk", base)
        try:
            print(snmp("snmpwalk", ip, community, base, ("-On",)))
        except Exception as e:
            print("  (none:", e, ")")
    print("\nCompare these numbers with the printer's own status/counter page, then put the matching OIDs in config.json.")

def rpc(cfg, fn, body):
    req = urllib.request.Request(cfg["supabase_url"] + "/rest/v1/rpc/" + fn, data=json.dumps(body).encode(),
        headers={"apikey": cfg["supabase_anon_key"], "Authorization": "Bearer " + cfg["supabase_anon_key"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode() or "null")

def read_printer(p):
    ip, com = p["ip"], p.get("community", "public")
    brand = p.get("brand", "kyocera").lower()
    serial = get(ip, com, SERIAL_OID)
    prof = PROFILES.get(brand, {"mono": [], "color": []})
    mono_oids = p.get("mono_oids") or prof["mono"]
    color_oids = p.get("color_oids") or prof["color"]
    if mono_oids:
        mono = sum(get_int(ip, com, o) for o in mono_oids)
        color = sum(get_int(ip, com, o) for o in color_oids) if color_oids else ""
        note = "Auto SNMP (" + brand + ")"
    elif p.get("total_only"):
        mono, color, note = get_int(ip, com, TOTAL_OID), "", "Auto SNMP - TOTAL pages only (no black/colour split)"
    else:
        raise RuntimeError("no verified counter OIDs for " + brand + " - run --discover " + ip + " or set total_only")
    return serial, mono, color, note

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config"); ap.add_argument("--discover"); ap.add_argument("--community", default="public")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.discover:
        discover(a.discover, a.community); return
    if not a.config:
        ap.error("--config or --discover required")
    cfg = json.load(open(a.config))
    state_file = os.path.splitext(a.config)[0] + ".state.json"
    state = json.load(open(state_file)) if os.path.exists(state_file) else {}
    today = datetime.date.today().isoformat()
    for cust in cfg["customers"]:
        info = rpc(cfg, "portal_get", {"t": cust["token"]})
        if not info:
            print("!! portal link not valid for a customer - check the token"); continue
        by_serial = {str(m["serial"]).strip().upper(): m for m in info["machines"] if m.get("serial")}
        for p in cust["printers"]:
            try:
                serial, mono, color, note = read_printer(p)
                m = by_serial.get(serial.strip().upper())
                if not m:
                    print("?? %s serial %s is not a saved machine of %s" % (p["ip"], serial, info["customer"]["name"])); continue
                key = serial.upper(); sig = [mono, color]
                if state.get(key) == sig:
                    print("-- %s %s unchanged, skipped" % (m["model"], serial)); continue
                print("%s %s  mono=%s colour=%s" % (m["model"], serial, mono, color if color != "" else "-"))
                if not a.dry_run:
                    r = rpc(cfg, "portal_submit", {"t": cust["token"], "k": "reading", "p": {"mid": m["id"], "mono": mono, "color": color, "date": today, "note": note}})
                    if not (r and r.get("ok")):
                        print("   not sent:", (r or {}).get("error")); continue
                    state[key] = sig
            except Exception as e:
                print("!! %s: %s" % (p.get("ip"), e))
    if not a.dry_run:
        json.dump(state, open(state_file, "w"))

if __name__ == "__main__":
    main()
