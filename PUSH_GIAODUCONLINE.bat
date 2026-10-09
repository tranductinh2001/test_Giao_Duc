@echo off
title Push GiaoDucOnline
cd /d "%~dp0"
echo ==========================================================
echo    DANG TIEN HANH PUSH CODE LEN GITHUB: GiaoDucOnline
echo ==========================================================
echo.
echo Neu trinh duyet bat len, vui long bam "Sign in with your browser" hoac "Authorize".
echo.
git push -u giaoduconline main --force
echo.
echo ==========================================================
echo    DA HOAN TAT!
echo ==========================================================
pause
