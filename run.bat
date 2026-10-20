@echo off
title Flat Management System
echo =======================================================
echo          Starting Flat Management System...
echo =======================================================
echo.
start http://localhost:3000
node server/index.js
pause
