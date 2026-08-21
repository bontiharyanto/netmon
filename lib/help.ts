import type { Locale } from "@/lib/i18n";

export type HelpArticle = {
  id: string;
  tags: string[];
  nocHref: string;
  portalHref: string;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "probe",
    tags: ["probe", "poller", "tcp", "worker", "up", "down", "dari mana"],
    nocHref: "/dashboard/devices",
    portalHref: "/portal/assets",
    title: {
      en: "Where does the probe come from?",
      id: "Probe datang dari mana?",
    },
    body: {
      en: "The probe is the NETMON poller. It runs on the NETMON worker process (the same server as the app: cloud VPS 103.190.214.224, or your on-prem NMS). Every 60 seconds it opens TCP port 80 to each device IP. The device does not install anything for this path. If the worker cannot route to that IP (typical for 10.x from the public cloud), status stays down.",
      id: "Probe adalah poller NETMON. Berjalan di proses worker di server NETMON (VPS cloud 103.190.214.224, atau NMS on-prem Anda). Setiap 60 detik membuka TCP port 80 ke IP perangkat. Perangkat tidak perlu install apa pun untuk jalur ini. Jika worker tidak bisa merutekan IP itu (umum untuk 10.x dari cloud publik), status tetap down.",
    },
  },
  {
    id: "agent",
    tags: ["agent", "heartbeat", "token", "install", "host", "dari mana"],
    nocHref: "/dashboard/agents",
    portalHref: "/portal/help",
    title: {
      en: "Where does the agent come from?",
      id: "Agent datang dari mana?",
    },
    body: {
      en: "The agent is a small script you run on the device (or a jump host that represents it). NETMON never SSH in. You issue a token on Agents for an Inventory device, then Copy install command on that host. The host POSTs HTTPS to /api/agent/heartbeat. First beat: pending → online and that device is marked up. Use this when the poller cannot reach a private IP but the host can reach https://your-tenant.netmon.click.",
      id: "Agent adalah skrip kecil yang Anda jalankan di perangkat (atau jump host). NETMON tidak SSH masuk. Terbitkan token di Agents untuk perangkat Inventory, lalu Copy install command di host itu. Host POST HTTPS ke /api/agent/heartbeat. Beat pertama: pending → online dan perangkat di-set up. Pakai ini jika poller tidak tembus IP privat, tetapi host bisa ke https://tenant.netmon.click.",
    },
  },
  {
    id: "inventory",
    tags: ["add", "device", "inventory", "import", "csv"],
    nocHref: "/dashboard/devices",
    portalHref: "/portal/assets",
    title: {
      en: "How do I add a device?",
      id: "Bagaimana menambah perangkat?",
    },
    body: {
      en: "Inventory first. Add hostname + IP + type on /dashboard/devices, or Import CSV/Excel with columns hostname, ip, type, location, city. City is an Indonesian city (Jakarta, Surabaya, BSD…). It places the device on Site map. Agents cannot create devices. IP must be unique. After that the poller and/or an agent can update status.",
      id: "Inventory dulu. Tambah hostname + IP + type di /dashboard/devices, atau Import CSV/Excel kolom hostname, ip, type, location, city. City adalah kota Indonesia (Jakarta, Surabaya, BSD…). Itu menempatkan perangkat di Peta. Agents tidak membuat perangkat baru. IP harus unik. Setelah itu poller dan/atau agent bisa mengubah status.",
    },
  },
  {
    id: "cmdb-edit",
    tags: ["cmdb", "ci", "edit", "asset tag", "serial"],
    nocHref: "/dashboard/cmdb",
    portalHref: "/portal/cmdb",
    title: {
      en: "Edit CMDB records",
      id: "Ubah catatan CMDB",
    },
    body: {
      en: "On /dashboard/cmdb, operators and admins can add, edit, and delete configuration items (name, type, asset tag, serial, owner, location, status, linked device). Portal /portal/cmdb is read-only.",
      id: "Di /dashboard/cmdb, operator dan admin bisa menambah, mengubah, dan menghapus CI (nama, tipe, asset tag, serial, owner, lokasi, status, perangkat terkait). Portal /portal/cmdb hanya baca.",
    },
  },
  {
    id: "users-edit",
    tags: ["user", "role", "password", "admin", "hapus"],
    nocHref: "/dashboard/users",
    portalHref: "/portal/help",
    title: {
      en: "Edit users",
      id: "Ubah pengguna",
    },
    body: {
      en: "Admins can change name, email, role, reset a password, or delete a user on /dashboard/users. You cannot delete yourself, demote/delete the last admin, or edit platform superadmin here. Operators cannot open Users. Change your own password on Account.",
      id: "Admin bisa mengubah nama, email, peran, reset kata sandi, atau menghapus pengguna di /dashboard/users. Anda tidak bisa menghapus diri sendiri, menurunkan/menghapus admin terakhir, atau mengedit superadmin platform di sini. Operator tidak membuka Users. Kata sandi sendiri di Account.",
    },
  },
  {
    id: "unknown-agent",
    tags: ["unknown agent", "token", "TOKEN_DARI_KARTU", "heartbeat"],
    nocHref: "/dashboard/agents",
    portalHref: "/portal/help",
    title: {
      en: "Unknown agent error",
      id: "Error Unknown agent",
    },
    body: {
      en: "The token you posted is not in the database. Do not use the example word TOKEN_DARI_KARTU. On Agents, Copy install command (long hex + --url=). Issuing a new token rotates the old one.",
      id: "Token yang dikirim tidak ada di database. Jangan pakai contoh TOKEN_DARI_KARTU. Di Agents, Copy install command (hex panjang + --url=). Issue token baru mematikan token lama.",
    },
  },
  {
    id: "all-down",
    tags: ["down", "mass", "ticker", "private ip", "firewall"],
    nocHref: "/dashboard",
    portalHref: "/portal",
    title: {
      en: "Why are all devices down?",
      id: "Mengapa semua perangkat down?",
    },
    body: {
      en: "On cloud SaaS the worker lives on the public VPS. It cannot TCP to RFC1918 addresses (10.x, 172.16.x). Open TCP 80 from 103.190.214.224 to a public IP, run NETMON on-prem on the LAN, or install agents that push outbound HTTPS. Also confirm the worker container is running.",
      id: "Di cloud SaaS worker ada di VPS publik. Ia tidak bisa TCP ke alamat privat (10.x, 172.16.x). Buka TCP 80 dari 103.190.214.224 ke IP publik, jalankan NETMON on-prem di LAN, atau pasang agent yang mendorong HTTPS keluar. Pastikan juga container worker berjalan.",
    },
  },
  {
    id: "worker",
    tags: ["worker", "redis", "poller", "60"],
    nocHref: "/dashboard",
    portalHref: "/portal/help",
    title: {
      en: "Poller / worker must be running",
      id: "Poller / worker harus hidup",
    },
    body: {
      en: "UI alone does not probe. Cloud: docker compose ps worker and logs should show [NETMON poller]. Laptop: npm run worker in a second terminal (needs Redis). Interval 60s, TCP port 80, timeout 2.5s.",
      id: "UI saja tidak mem-probe. Cloud: docker compose ps worker dan log [NETMON poller]. Laptop: npm run worker di terminal kedua (butuh Redis). Interval 60 detik, TCP port 80, timeout 2,5 detik.",
    },
  },
  {
    id: "topology",
    tags: ["topology", "map", "excel", "pdf", "csv"],
    nocHref: "/dashboard/topology",
    portalHref: "/portal/topology",
    title: {
      en: "Topology map",
      id: "Peta topologi",
    },
    body: {
      en: "Topology is a drawing of links, not a probe. Upload from,to,status. Download CSV/Excel/PDF filled from the current table. Endpoints must match Inventory hostnames or IPs.",
      id: "Topology adalah gambar tautan, bukan probe. Unggah from,to,status. Unduh CSV/Excel/PDF terisi dari tabel saat ini. Endpoint harus cocok hostname atau IP Inventory.",
    },
  },
  {
    id: "sitemap",
    tags: ["map", "peta", "kota", "indonesia", "city", "location", "jakarta"],
    nocHref: "/dashboard/map",
    portalHref: "/portal/map",
    title: {
      en: "Indonesia site map",
      id: "Peta kota Indonesia",
    },
    body: {
      en: "Site map is a geographic map of Indonesia (not topology). Pins are cities that have devices. Set City on Inventory, or put a city name in Location (Jakarta, Surabaya, Bekasi, BSD). Unmapped devices stay in the side list. Tiles need internet (CARTO/OSM).",
      id: "Peta situs adalah peta geografis Indonesia (bukan topologi). Pin adalah kota yang punya perangkat. Isi City di Inventory, atau tulis nama kota di Location (Jakarta, Surabaya, Bekasi, BSD). Perangkat tanpa kota ada di daftar samping. Tile butuh internet (CARTO/OSM).",
    },
  },
  {
    id: "reports",
    tags: ["report", "pdf", "excel", "xlsx", "period", "tanggal", "laporan"],
    nocHref: "/dashboard/reports",
    portalHref: "/portal/help",
    title: {
      en: "Operations report",
      id: "Laporan operasi",
    },
    body: {
      en: "Reports is a period snapshot: 24h, 7 days, 30 days, this month, or custom dates. Preview tables first (devices, alerts, tickets), then Download PDF or Excel. Device status is current. Alerts and tickets follow the date range. SLA is the rolling 30-day figure, not recomputed for the range.",
      id: "Reports adalah cuplikan periode: 24 jam, 7 hari, 30 hari, bulan ini, atau tanggal kustom. Preview tabel dulu (perangkat, alert, tiket), lalu unduh PDF atau Excel. Status perangkat adalah kondisi saat ini. Alert dan tiket mengikuti rentang tanggal. SLA adalah angka 30 hari berjalan, bukan dihitung ulang untuk rentang itu.",
    },
  },
  {
    id: "password",
    tags: ["password", "30", "security", "account"],
    nocHref: "/dashboard/account",
    portalHref: "/portal/account",
    title: {
      en: "Password every 30 days",
      id: "Kata sandi setiap 30 hari",
    },
    body: {
      en: "Default rotation is 30 days (Security: Never / 30 / 60 / 90). A reminder appears 7 days before. After expiry you can only use Account until you set a new password.",
      id: "Rotasi default 30 hari (Security: Never / 30 / 60 / 90). Pengingat 7 hari sebelumnya. Setelah kedaluwarsa hanya Account yang terbuka sampai kata sandi diganti.",
    },
  },
  {
    id: "ticker",
    tags: ["ticker", "running text", "incident", "edit"],
    nocHref: "/dashboard/security",
    portalHref: "/portal/help",
    title: {
      en: "Incident running text",
      id: "Teks berjalan insiden",
    },
    body: {
      en: "A line under the header appears on mass outage, or when an operator saves custom text (Edit on the ticker, or Security → Incident ticker). Check “show even without mass outage” to keep it visible.",
      id: "Baris di bawah header muncul saat gangguan massal, atau jika operator menyimpan teks kustom (Edit di ticker, atau Security → Incident ticker). Centang tampilkan meski tidak ada gangguan massal agar tetap terlihat.",
    },
  },
  {
    id: "notify",
    tags: ["email", "slack", "channel", "ticket", "novacrm"],
    nocHref: "/dashboard/settings",
    portalHref: "/portal/tickets",
    title: {
      en: "Alerts, channels, tickets",
      id: "Alert, kanal, tiket",
    },
    body: {
      en: "When poller marks a device down it creates a critical device_down alert, notifies enabled channels, and can auto-open Helpdesk or NovaCRM. Configure Settings → Channels and Settings → Ticketing.",
      id: "Saat poller menandai down, alert critical device_down dibuat, kanal yang enabled diberitahu, dan tiket Helpdesk atau NovaCRM bisa auto-open. Atur Settings → Channels dan Settings → Ticketing.",
    },
  },
  {
    id: "cctv",
    tags: ["cctv", "nvr", "dvr", "camera", "hikvision", "dahua", "axis", "vms", "onvif", "rtsp"],
    nocHref: "/dashboard/devices",
    portalHref: "/portal/assets",
    title: {
      en: "Can I monitor CCTV?",
      id: "Bisa monitor CCTV?",
    },
    body: {
      en: "Yes, as inventory up/down — not live video. Add the NVR or camera IP (type nvr or camera). Vendor is a label (Hikvision, Dahua, Axis, …); there is no brand SDK. Poller uses TCP 80. Private LAN from cloud needs an agent. NETMON does not pull cameras from a VMS. Details: docs/MONITORING.md section 4.4.",
      id: "Ya, sebagai up/down di Inventory — bukan live video. Daftarkan IP NVR atau kamera (type nvr atau camera). Vendor hanya label (Hikvision, Dahua, Axis, …); tidak ada SDK merek. Poller memakai TCP 80. IP lokal dari cloud butuh agent. NETMON tidak menarik daftar kamera dari VMS. Rincian: docs/MONITORING.md bagian 4.4.",
    },
  },
];

export function searchHelp(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter((article) => {
    const hay = [
      article.id,
      article.title.en,
      article.title.id,
      article.body.en,
      article.body.id,
      ...article.tags,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function helpHref(article: HelpArticle, role?: string | null) {
  return role === "viewer" ? article.portalHref : article.nocHref;
}
