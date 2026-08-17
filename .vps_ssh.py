#!/usr/bin/env python3
"""Run a command on the Gymholic VPS over SSH (password auth)."""
import os
import sys
import paramiko

HOST = "186.240.157.98"
USER = "root"
KEY_PATH = os.path.expanduser("~/.ssh/gymholic_github_actions")


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "echo no command"
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username=USER,
        key_filename=KEY_PATH,
        look_for_keys=False,
        allow_agent=False,
        timeout=25,
    )
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
        out = stdout.read().decode("utf-8", "replace")
        err = stderr.read().decode("utf-8", "replace")
        rc = stdout.channel.recv_exit_status()
        if out:
            print(out, end="" if out.endswith("\n") else "\n")
        if err:
            print("[stderr]", err, end="" if err.endswith("\n") else "\n")
        return rc
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
