# Operations: keeping the server available (NFR-QA-3)

NFR-QA-3: the server shall be available at least 99 % of the time during scheduled
demonstration and testing periods.

## Before a demo or test session

- Keep the laptop plugged in and **turn off sleep** (Windows: Settings > System > Power >
  "When plugged in, put my device to sleep after" = Never; macOS: `caffeinate -i` in a
  terminal). In the measured run below the laptop went to sleep for 9 minutes, which stopped
  the server as well.

## Run the server so it restarts by itself

```bash
npm run start:supervised --prefix server
```

This starts `node src/server.js` and starts it again whenever it exits: after 1 s, then 2,
4 ... up to 30 s if it keeps failing straight away. Every start and exit is printed with the
time. Press Ctrl+C to stop both. (`npm run dev` uses nodemon, which restarts only when a file
changes, not after a crash.)

## Measure availability

In a second terminal, during the demo or test session:

```bash
npm run monitor --prefix server -- --minutes 60
```

Every 10 s it calls `GET /api/health`. A check counts as up only when the server answers
within 5 s **and** reports the database as up (`"db": "up"`). At the end it prints the
availability, the longest outage and the health response times, and `PASS` when availability
is at least 99 %. Options: `--interval 10` (seconds), `--url http://localhost:5000`; without
`--minutes` it runs until Ctrl+C.

Note: `/api/health` answers HTTP 200 even when the database is down, with `"db": "down"` in
the body. The monitor reads the body; an external monitoring tool must do the same.

## Backups

Backup and restore are described in the README (section 8):
`npm run backup --prefix server` and `npm run restore --prefix server -- backups/<folder> --yes`.
The script keeps the newest `BACKUP_KEEP` folders (default 7). To run it every day:

- **Linux/macOS (cron):** `crontab -e`, then
  `0 2 * * * cd /path/to/SE_mini_project/server && npm run backup`
- **Windows (Task Scheduler):** Create Basic Task, Daily at 02:00, Start a program `npm.cmd`
  with arguments `run backup` and "Start in" set to the `server` folder.

## Measured result (5 Nov 2026)

One Windows laptop ran the supervised server (production mode), MongoDB, the monitor (every
10 s for 60 minutes) and a continuous chat load: `npm run perf:latency` was repeated 73 times
(100 users each time).

| Measure | Result |
|---|---|
| Availability | **305 of 306 checks up = 99.67 % (target 99 %): Pass** |
| Restart after the server was stopped on purpose at 07:13:16 UTC | Running again at 07:13:17 (1 s); no check failed |
| Laptop sleep (Windows Modern Standby) 07:32:58 - 07:42:02 UTC | No checks ran while it slept (306 instead of about 360); the one failed check is the moment it woke |
| Health response time | p50 9 ms, p95 50 ms, max 1004 ms |
| Chat latency under the load (p95 per run) | 18-22 ms for the first 35 minutes, then 46 ms (minutes 35-40), 329 ms (40-45) and 157 ms (45-50); one run failed at 1312 ms |

Every check while the laptop was awake succeeded. The slower chat latency in the last 15
minutes before the laptop went to sleep is not explained: it may be Windows power management
before standby, or the server. Repeat the run with sleep turned off before the final demo.
