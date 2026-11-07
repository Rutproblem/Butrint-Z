# Biblioteka Online

Projekt edukativ me React Native dhe Expo. Aplikacioni është shkruar në JavaScript dhe përdor Expo/Metro; nuk përdor TypeScript apo Vite.

## Nisja

Kërkohet Node.js LTS dhe npm. Në dosjen e projektit ekzekuto:

```bash
npm install
npm start
```

Instalo aplikacionin Expo Go në telefon dhe skano QR kodin, ose zgjidh Android/iOS nga terminali Expo. Për Android emulator mund të përdorësh `npm run android`.

## Funksionet

- Shfaqje, kërkim dhe filtrim librash
- Shtim, editim dhe fshirje librash
- Faqe blerjeje me sasi, të dhëna blerësi, adresë dhe total
- Ruajtje e përhershme e librave dhe porosive në MySQL
- Faturë/konfirmim me numër porosie

Nuk ka më ruajtje alternative në memorie: kur PHP/MySQL nuk arrihet, veprimet dështojnë me gabim dhe nuk shfaqen sikur janë ruajtur. Blerja është demonstrative dhe nuk kryen pagesë reale.

## XAMPP: PHP dhe MySQL

1. Nis `Apache` dhe `MySQL` nga XAMPP Control Panel.
2. Krijo dosjen `C:\xampp\htdocs\biblioteka-api` dhe kopjo brenda saj dosjen `backend` të projektit (skedarët `api.php`, `schema.sql`, `config.example.php`). Emri i folderit duhet të jetë `biblioteka-api`.
3. Kopjo `config.example.php` si `config.php`. Kontrollo host-in, emrin e databazës dhe kredencialet MySQL te `config.php`.
4. Hape `http://localhost/phpmyadmin`, zgjidh **Import**, dhe ngarko `schema.sql`. Kjo krijon `biblioteka_online`, tabelat e librave/porosive dhe katër libra shembull.
5. Skedari lokal `.env` përdor IP-në e këtij kompjuteri. Nëse e ndryshon rrjetin, gjej adresën IPv4 me `ipconfig` dhe vendose te `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.132/biblioteka-api/api.php
```

IP-ja në shembull i përket këtij kompjuteri dhe mund të ndryshojë. Në telefon fizik, sigurohu që telefoni dhe kompjuteri janë në të njëjtin Wi-Fi. Android Emulator përdor `http://10.0.2.2/biblioteka-api/api.php`; iOS Simulator zakonisht përdor `http://localhost/biblioteka-api/api.php`.
6. Nëse telefoni nuk hap API-në, lejo `Apache HTTP Server` për rrjetin **Private** te Windows Defender Firewall. Mos e çaktivizo firewall-in. Në mungesë të një rregulli ekzistues, hape PowerShell si Administrator dhe shto rregull vetëm për portin 80 nga subnet-i lokal:

```powershell
New-NetFirewallRule -DisplayName "XAMPP Apache (Private LAN)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Private -RemoteAddress LocalSubnet
```

7. Rinis Metro që të lexojë `.env`:

```bash
npm start -- --clear
```

Katalogu dhe veprimet CRUD përdorin gjithmonë PHP/MySQL. Endpoint-i i porosisë kontrollon stokun brenda transaksionit, ruan blerësin/porosinë/rreshtin e librit dhe ul stokun. Mund të kontrollosh librat në `books` dhe porositë në `orders`/`order_items` përmes phpMyAdmin.

Skema e API-së gjendet te `backend/api.php`; konfigurimi lokal i kredencialeve ruhet te `backend/config.php` dhe përjashtohet nga Git. Mos përdor këto kredenciale demo në një server publik.

Ky është projekt mësimor: blerja nuk kryen pagesë online dhe API-ja nuk ka autentikim, ndaj nuk është për përdorim real.