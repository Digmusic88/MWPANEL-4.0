# SECURITY REPORT - CRITICAL INCIDENT
## MundoWorld School Server - mocks.mundoworld.school

**Incident Date**: December 31, 2025 - January 1, 2026
**Report Date**: January 1, 2026
**Classification**: CRITICAL
**Status**: RESOLVED AND SECURED

---

## 1. EXECUTIVE SUMMARY

The MundoWorld School server suffered a security intrusion where attackers exploited a critical Remote Code Execution (RCE) vulnerability in Next.js 15.5.0. The attackers installed a botnet/cryptominer malware called `x86_64.uhavenobotsxd` that established connections to a Command and Control (C2) server on Amazon AWS.

**Outcome**: The incident was completely remediated, malware removed, vulnerabilities patched, and multiple additional security layers were implemented.

---

## 2. ROOT CAUSE ANALYSIS

### 2.1 Primary Vulnerability
```
CRITICAL VULNERABILITY: CVE GHSA-9qr9-h5gf-34mp
Component: Next.js 15.5.0
Type: Remote Code Execution (RCE) in React Flight Protocol
Severity: CRITICAL
```

This vulnerability allowed attackers to execute arbitrary code on the server through Next.js's React Flight protocol. Attackers scanned the server, detected the vulnerable version, and exploited the vulnerability to install malware.

### 2.2 Additional Vulnerabilities Detected
| Package | Severity | Description |
|---------|----------|-------------|
| jws < 3.2.3 | HIGH | Improper HMAC signature verification |
| jspdf <= 3.0.1 | HIGH | Denial of Service (DoS) |
| js-yaml 4.0.0-4.1.0 | MEDIUM | Prototype Pollution |
| next-auth < 4.24.12 | MEDIUM | Email misdelivery vulnerability |

### 2.3 Attack Timeline
1. **December 20, 2025**: LeakIX scanner detects server and tests exploits
2. **December 20-30**: Multiple attacker IPs attempt to exploit vulnerabilities
3. **~December 30**: Successful attack - malware installed
4. **December 31**: Active malware connecting to C2 server
5. **January 1, 2026**: 9 system reboots due to malware-caused instability

---

## 3. ATTACK EVIDENCE

### 3.1 Scanning and Attack Logs
```
# RCE attempts detected in nginx logs:
207.154.212.47 - LeakIX scanner:
  - GET /nodesync?cmd=hostname
  - GET /exec?cmd=hostname
  - POST /php-cgi/php-cgi.exe (PHP exploit)

# IPs with successful POSTs (HTTP 200):
78.153.140.50  - Multiple successful POSTs
78.153.140.250 - Attempted /.env access + successful POST
20.246.95.122  - python-requests successful POST
```

### 3.2 Identified Malware
```
Name: x86_64.uhavenobotsxd
Type: Botnet / Cryptominer
Disguised processes: {httpd}, [crond]
C2 Server: 16.185.242.248 (Amazon AWS, Seattle)

Malicious files found:
- /opt/cambridge-mocks-prod/time-machine-backups/.update (95,888 bytes, ELF x86_64)
- /opt/mw-panel/cambridge-mocks-data/data/.update
- /opt/mw-panel/cambridge-mocks-data/data/.monitor
```

---

## 4. REMEDIATION ACTIONS TAKEN

### 4.1 Immediate Containment
- [x] cambridge-mocks-app container stopped
- [x] Malicious process terminated
- [x] C2 connections interrupted

### 4.2 Malware Removal
- [x] 3 malicious binary files deleted
- [x] Docker container completely removed
- [x] Docker image rebuilt from scratch (--no-cache)

### 4.3 Security Updates
- [x] **Next.js updated**: 15.5.0 -> 15.5.9 (RCE patched)
- [x] **npm audit fix**: 0 remaining vulnerabilities
- [x] Dependencies automatically updated

### 4.4 Network Blocking
Malicious IPs blocked in iptables:
- 16.185.242.248 (C2 Server)
- 78.153.140.50, 78.153.140.250
- 87.121.84.154
- 45.225.251.3
- 5.187.35.21
- 207.154.212.47
- 193.142.147.209

### 4.5 Nginx Hardening
```nginx
# New protections implemented:

# Attack pattern blocking
location ~* (exec|cmd|shell|\.\./) { deny all; }

# Sensitive file blocking
location ~* \.(env|git|bak|sql|log)$ { deny all; }

# Rate limiting
- General: 10 req/s with burst of 20
- API: 10 req/s with burst of 10
- Login: Burst limited to 3

# Connection limits
- 20 simultaneous connections per IP
```

---

## 5. CURRENT SYSTEM STATUS

### 5.1 Verified Services
| Service | Status | Version |
|---------|--------|---------|
| Cambridge Mocks | OK | Next.js 15.5.9 |
| MW Panel | OK | Operational |
| Nginx | OK | Rate limiting active |
| Firewall | OK | IPs blocked |

### 5.2 Security Verification
```bash
# npm vulnerabilities
$ npm audit
found 0 vulnerabilities

# Connections to malicious IP
$ ss -tunapl | grep 16.185
(no results - blocked)

# Suspicious processes
$ docker exec cambridge-mocks-app ps aux
Only legitimate processes: npm, next-server, crond
```

---

## 6. RECOMMENDATIONS TO PREVENT FUTURE INCIDENTS

### 6.1 CRITICAL (Implement Immediately)
1. **SSH Key Authentication**
   - Generate SSH key pair
   - Disable PasswordAuthentication
   - This prevents brute force attacks

2. **Automatic Security Updates**
   ```bash
   # Configure automatic updates
   apt install unattended-upgrades
   dpkg-reconfigure unattended-upgrades
   ```

3. **Dependency Monitoring**
   - Run `npm audit` regularly
   - Configure Dependabot alerts on GitHub

### 6.2 IMPORTANT (Short Term)
1. **Fail2ban for Cambridge Mocks**
   - Create specific jail to detect scans
   - Ban IPs with attack patterns

2. **Centralized Security Logs**
   - Configure alerts for suspicious patterns
   - Monitor unusual POSTs to endpoints

3. **Read-Only Containers**
   - Configure cambridge-mocks container as read-only
   - Prevent malware from writing files

### 6.3 BEST PRACTICES (Long Term)
1. **Periodic Vulnerability Scanning**
   - Run scanners like Trivy or Clair
   - Quarterly security audits

2. **Network Segmentation**
   - Isolate containers in separate networks
   - Limit communication between services

3. **Secure Backups**
   - Verify backup integrity
   - Maintain offline backups

---

## 7. LESSONS LEARNED

1. **Dependency vulnerabilities are critical**: A single outdated dependency (Next.js) allowed complete compromise.

2. **Automated scanners are constant**: The server was scanned by LeakIX just days before the successful attack.

3. **Malware hides well**: Processes disguised themselves as httpd and crond to avoid detection.

4. **Backup directories are targets**: Malware was stored in backup directories to go unnoticed.

5. **Rate limiting is essential**: Without it, attackers could make hundreds of attempts without restriction.

---

## 8. CONCLUSION

The incident was caused by a critical vulnerability in Next.js 15.5.0 that allowed remote code execution. Attackers exploited this vulnerability to install a botnet/cryptominer.

**Completed actions**:
- Malware removed
- Vulnerabilities patched
- System secured with multiple protection layers

**The system is now secure and operational.**

---

*Report generated on January 1, 2026*
*System: MundoWorld School - mocks.mundoworld.school*
