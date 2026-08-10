$password = "mtW4+byBaxeuS6lE"
$commands = @"
echo '=== Port Listeners ==='
ss -lntp | grep ':80\|:443'
echo '=== Docker Inspect Nginx ==='
docker inspect gymholic-nginx --format='{{json .NetworkSettings.Ports}}' | python3 -m json.tool 2>/dev/null || echo 'Ports: {{json .NetworkSettings.Ports}}'
echo '=== Nginx Config Check ==='
docker exec gymholic-nginx nginx -t
echo '=== Test HTTP Locally ==='
curl -sI http://localhost/
echo '=== Test HTTPS Locally ==='
curl -skI https://localhost/
echo '=== DNS Check ==='
dig +short gymholic.ae
dig +short www.gymholic.ae
echo '=== Check for Hostinger Proxy ==='
ps aux | grep -i nginx | grep -v grep | grep -v docker
"@

$process = Start-Process -FilePath "ssh" -ArgumentList "-o","StrictHostKeyChecking=no","root@186.240.157.98",$commands -NoNewWindow -PassThru -Wait -RedirectStandardOutput "ssh_output.txt" -RedirectStandardError "ssh_error.txt"

if (Test-Path "ssh_output.txt") {
    Get-Content "ssh_output.txt"
}
if (Test-Path "ssh_error.txt") {
    Write-Host "=== ERRORS ===" -ForegroundColor Red
    Get-Content "ssh_error.txt"
}
