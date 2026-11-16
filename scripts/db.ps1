param(
  [ValidateSet('start', 'stop', 'status')]
  [string]$Action = 'status'
)

$bin = Join-Path $env:TEMP 'opencode\pg\pgsql\bin'
$data = Join-Path $env:USERPROFILE '.local\pgdata'

if (-not (Test-Path (Join-Path $bin 'pg_ctl.exe'))) {
  Write-Error "Postgres portable tidak ditemukan di $bin. Lihat README bagian database."
  exit 1
}

switch ($Action) {
  'start' {
    & (Join-Path $bin 'pg_ctl.exe') -D $data -l (Join-Path $data 'server.log') -o '-p 5432' start
  }
  'stop' {
    & (Join-Path $bin 'pg_ctl.exe') -D $data stop
  }
  'status' {
    & (Join-Path $bin 'pg_isready.exe') -h 127.0.0.1 -p 5432
  }
}
