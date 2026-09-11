<#
  Keeps the home relay and its tunnel alive.

  The relay only helps while it is running, and two things stop it: the Node
  process exiting, and the SSH reverse tunnel dropping. The second is the common
  one, because a home connection changes address, drops briefly, or the laptop
  closes, and SSH does not come back on its own. This watches both and restarts
  whichever died.

  It cannot do anything about the machine sleeping. A sleeping PC is off the
  network, so YouTube goes dark until it wakes; the site keeps working for every
  other platform, which is the designed behaviour when no relay is reachable.
  If that matters, either stop this machine sleeping or move the relay to
  something always on: this script runs anywhere Node and ssh exist.

  Register it to start at logon (no password needed, runs as you):

    schtasks /Create /TN PasteAndSaveRelay /SC ONLOGON /RL HIGHEST /F ^
      /TR "powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%USERPROFILE%\Documents\social-saver\ops\home-relay-supervisor.ps1\""

  Start it now without waiting for a logon:

    schtasks /Run /TN PasteAndSaveRelay

  Watch what it is doing:

    Get-Content "$env:LOCALAPPDATA\pasteandsave-relay\supervisor.log" -Tail 30 -Wait
#>

param(
  [string]$Server = "root@169.58.39.246",
  [int]$Port      = 8081,
  [string]$RelayScript = "$PSScriptRoot\home-relay.mjs"
)

$ErrorActionPreference = "Continue"
$logDir = "$env:LOCALAPPDATA\pasteandsave-relay"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = "$logDir\supervisor.log"

function Say($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $log -Value $line -Encoding utf8
  # Keep the log from growing without bound on a machine left running for months.
  if ((Get-Item $log -ErrorAction SilentlyContinue).Length -gt 2MB) {
    $keep = Get-Content $log -Tail 500
    Set-Content -Path $log -Value $keep -Encoding utf8
  }
}

function Start-Relay {
  Say "starting relay: node $RelayScript"
  Start-Process -FilePath "node" -ArgumentList "`"$RelayScript`"" `
    -RedirectStandardOutput "$logDir\relay.out.log" `
    -RedirectStandardError  "$logDir\relay.err.log" `
    -WindowStyle Hidden -PassThru
}

function Start-Tunnel {
  # ExitOnForwardFailure matters: without it ssh stays connected while the
  # forward silently failed, so the supervisor sees a healthy process and the
  # server sees nothing listening. Better to exit and be restarted.
  $sshArgs = @(
    "-N", "-T",
    "-o", "BatchMode=yes",
    "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-o", "StrictHostKeyChecking=accept-new",
    "-R", "${Port}:127.0.0.1:${Port}",
    $Server
  )
  Say "starting tunnel: ssh -R ${Port}:127.0.0.1:${Port} $Server"
  Start-Process -FilePath "ssh" -ArgumentList $sshArgs `
    -RedirectStandardError "$logDir\tunnel.err.log" `
    -WindowStyle Hidden -PassThru
}

function Clear-StalePort {
  # A tunnel killed without a clean close leaves the port bound on the server
  # for a while, and the next ssh then exits immediately on
  # "remote port forwarding failed". Clearing it makes a restart reliable
  # instead of needing a human.
  Say "clearing any stale listener on server port $Port"
  & ssh -o BatchMode=yes -o ConnectTimeout=15 $Server "fuser -k $Port/tcp 2>/dev/null; exit 0" 2>$null | Out-Null
}

# One supervisor at a time. Two of them fight over the same local port and the
# same remote forward, and the symptom is a tunnel that appears to flap forever
# while each instance kills the other's listener. A logon while one is already
# running is the obvious way to end up with two.
$mutex = New-Object System.Threading.Mutex($false, "Global\PasteAndSaveRelaySupervisor")
try {
  $held = $mutex.WaitOne(0)
} catch [System.Threading.AbandonedMutexException] {
  # The previous holder was killed rather than exiting. The mutex is ours now,
  # and this is the normal case after a crash or a forced restart - treating it
  # as an error meant a killed supervisor could never be replaced, which is the
  # opposite of what this guard is for.
  Say "previous supervisor exited without releasing; taking over"
  $held = $true
}
if (-not $held) {
  Say "another supervisor is already running, exiting"
  exit 0
}

Say "supervisor starting (server=$Server port=$Port)"
$relay  = Start-Relay
Start-Sleep -Seconds 3
Clear-StalePort
$tunnel = Start-Tunnel
$tunnelFailures = 0

while ($true) {
  Start-Sleep -Seconds 15

  if ($null -eq $relay -or $relay.HasExited) {
    Say "relay is not running, restarting it"
    $relay = Start-Relay
    Start-Sleep -Seconds 3
  }

  if ($null -eq $tunnel -or $tunnel.HasExited) {
    $tunnelFailures++
    $tail = (Get-Content "$logDir\tunnel.err.log" -Tail 1 -ErrorAction SilentlyContinue)
    Say "tunnel is down (failure #$tunnelFailures). last error: $tail"
    # Repeated immediate failures usually mean the port is still held remotely,
    # so clear it before trying again rather than looping on the same error.
    if ($tunnelFailures -ge 2) { Clear-StalePort }
    # Back off a little so a server that is down or unreachable is not hammered.
    $wait = [Math]::Min(60, 5 * $tunnelFailures)
    Say "retrying in $wait seconds"
    Start-Sleep -Seconds $wait
    $tunnel = Start-Tunnel
  } else {
    # Healthy for a full cycle, so forget the earlier failures.
    if ($tunnelFailures -gt 0) { Say "tunnel healthy again"; $tunnelFailures = 0 }
  }
}
