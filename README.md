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
- Panel i veçantë zhvilluesi për menaxhimin e librave, porosive dhe llogarive të administratorëve
- Ngarkim opsional i kopertinave për librat (JPG, PNG ose WebP deri në 4 MB)
- Editim dhe anulim porosish me përditësim të stokut
- Faqe blerjeje me sasi, të dhëna blerësi, adresë dhe total
- Ruajtje e përhershme e librave dhe porosive në MySQL
- Faturë/konfirmim me numër porosie

Nuk ka ruajtje alternative në memorie: kur PHP/MySQL nuk arrihet, veprimet dështojnë me gabim dhe nuk shfaqen sikur janë ruajtur. Menaxhimi i librave dhe porosive kërkon llogari zhvilluesi; porositë e përfunduara nuk mund të ndryshohen ose anulohen. Blerja është demonstrative dhe nuk kryen pagesë reale.

## XAMPP: PHP dhe MySQL

1. Nis `Apache` dhe `MySQL` nga XAMPP Control Panel.
2. Krijo dosjen `C:\xampp\htdocs\biblioteka-api` dhe kopjo brenda saj skedarët nga dosja `backend` e projektit, përfshirë `api.php`, `schema.sql`, `config.example.php` dhe `create_developer.php`. Emri i folderit duhet të jetë `biblioteka-api`.
3. Kopjo `config.example.php` si `config.php`. Kontrollo host-in, emrin e databazës dhe kredencialet MySQL te `config.php`.
4. Hape `http://localhost/phpmyadmin`, zgjidh **Import**, dhe ngarko `schema.sql`. Mund ta importosh përsëri pas përditësimit: ai krijon tabelat e zhvilluesve dhe të imazheve pa i dublikuar librat shembull.
5. Krijo llogarinë e parë të administratorit nga PowerShell. Emri duhet të ketë 3-80 karaktere; fjalëkalimi të paktën 12. Fjalëkalimi kërkohet si `SecureString` dhe ruhet vetëm si hash. Pasi të hysh në panel, administratorët ekzistues mund të krijojnë llogari të tjera nga skeda **Adminë**; të gjitha llogaritë kanë të njëjtat leje:

```powershell
$username = Read-Host "Developer username"
$securePassword = Read-Host "Developer password" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  "$username`n$plainPassword" | & 'C:\xampp\php\php.exe' 'C:\xampp\htdocs\biblioteka-api\create_developer.php'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
```

6. Skedari lokal `.env` përdor IP-në e këtij kompjuteri. Nëse e ndryshon rrjetin, gjej adresën IPv4 me `ipconfig` dhe vendose te `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.132/biblioteka-api/api.php
```

IP-ja në shembull i përket këtij kompjuteri dhe mund të ndryshojë. Në telefon fizik, sigurohu që telefoni dhe kompjuteri janë në të njëjtin Wi-Fi. Android Emulator përdor `http://10.0.2.2/biblioteka-api/api.php`; iOS Simulator zakonisht përdor `http://localhost/biblioteka-api/api.php`.
7. Nëse telefoni nuk hap API-në, lejo `Apache HTTP Server` për rrjetin **Private** te Windows Defender Firewall. Mos e çaktivizo firewall-in. Në mungesë të një rregulli ekzistues, hape PowerShell si Administrator dhe shto rregull vetëm për portin 80 nga subnet-i lokal:

```powershell
New-NetFirewallRule -DisplayName "XAMPP Apache (Private LAN)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Private -RemoteAddress LocalSubnet
```

8. Rinis Metro që të lexojë `.env`:

```bash
npm start -- --clear
```

Katalogu dhe veprimet CRUD përdorin gjithmonë PHP/MySQL. Kopertinat janë opsionale; skedarët ruhen te `biblioteka-api/uploads/books` dhe lidhja e tyre te tabela `book_images`. Apache duhet të ketë leje shkrimi në dosjen `biblioteka-api`; API-ja e krijon `uploads/books` kur nevojitet. Endpoint-i i porosisë kontrollon stokun brenda transaksionit, ruan blerësin/porosinë/rreshtin e librit dhe ul stokun. Mund të kontrollosh librat në `books` dhe porositë në `orders`/`order_items` përmes phpMyAdmin.

Llogaria e zhvilluesit hyn në panel përmes një tokeni bearer që skadon pas 8 orësh; API-ja ruan vetëm hash-in e tokenit. Menaxhimi kërkon autentikim, por katalogu dhe krijimi i porosive mbeten publike, ndaj ky është projekt mësimor dhe jo për përdorim në server publik. Konfigurimi lokal i kredencialeve ruhet te `backend/config.php` dhe përjashtohet nga Git.

Ky është projekt mësimor: blerja nuk kryen pagesë online dhe API-ja publike nuk ka autentikim, ndaj nuk është për përdorim real.