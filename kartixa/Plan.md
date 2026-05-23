# Kartixa iOS — Portierungs-Plan

Roadmap zur Portierung der bestehenden Kartixa Web-App (Next.js) in eine native
iPhone-App in **Swift + SwiftUI**, mit lokaler Persistenz via **iCloud Container**
(kein Backend, keine API, keine eigene Authentifizierung).

---

## 1. Analyse der Web-App

### 1.1 Tech-Stack (Ist-Zustand)

| Bereich            | Verwendet                                          |
| ------------------ | -------------------------------------------------- |
| Framework          | Next.js 16 (App Router) + React 19                 |
| Sprache            | TypeScript                                         |
| Styling            | Tailwind CSS 4                                     |
| State Management   | React `useState` / `useEffect`, kein Redux         |
| Persistenz         | MariaDB 11 via Drizzle ORM                         |
| API-Schicht        | REST `/api/v1/...`, Zod-Validierung, `apiHandler`  |
| Auth               | NextAuth.js 5 (Email-OTP, Trusted Devices)         |
| i18n               | next-intl (DE / EN)                                |
| Icons              | lucide-react                                       |
| Mail               | nodemailer (SMTP, optional)                        |

### 1.2 Routes / Seiten

| Route                                   | Beschreibung                                        |
| --------------------------------------- | --------------------------------------------------- |
| `/`                                     | Redirect → `/liga`                                  |
| `/login`                                | Login (Email + Passwort, optional OTP)              |
| `/register`                             | Registrierung (Email-OTP-Verifikation)              |
| `/reset-password`                       | Passwort-Reset via Email-Code                       |
| `/settings`                             | Profil, Leagues verlassen, Sessions, Passwort       |
| `/about`                                | Über die App + Punktesystem                         |
| `/blog`                                 | Statisch (vermutlich Stub)                          |
| `/datenschutz`                          | Datenschutz-Seite                                   |
| `/liga`                                 | League-Übersicht + Join-by-Code                     |
| `/liga/new`                             | Neue Liga anlegen (Tracks, Teams, Driver)           |
| `/liga/[leagueId]`                      | Liga-Detail (Season-Auswahl, Rankings, Races, ...)  |
| `/liga/[leagueId]/edit`                 | Liga bearbeiten (Name, Beschreibung, Tracks, Teams) |
| `/liga/[leagueId]/drivers`              | Fahrer-Verwaltung (Add/Edit/Delete)                 |
| `/liga/[leagueId]/race/new`             | Neues Rennen anlegen                                |
| `/liga/[leagueId]/race/[raceId]`        | Rennen-Detail (Results, Podium)                     |
| `/liga/[leagueId]/race/[raceId]/edit`   | Rennen bearbeiten + Löschen                         |

### 1.3 Features & Nutzer-Interaktionen

1. League CRUD (anlegen, bearbeiten, löschen)
2. Tracks pro Liga verwalten (frei wählbar + custom bei Renn-Anlage)
3. Teams pro Liga (optional, aktiv/inaktiv)
4. Seasons pro Liga (mehrere, aktive Season, Fahrer übernehmen)
5. Driver-Verwaltung pro Season (Name, Nummer, Team-Zuordnung)
6. Race-Anlage mit beliebig vielen Result-Zeilen
7. Race-Result: Position (sortierbar via ↑/↓), Driver, Lap-Time, Fastest Lap, DNF
8. "Unknown Driver"-Platzhalter für Nicht-Liga-Teilnehmer (bekommt 0 Punkte)
9. Strafen pro Result: `seconds` / `grid` / `points` mit Notiz
10. Automatische Punkteberechnung (F1-Style 25-18-15-…-1) + Fastest-Lap-Bonus
11. Driver-Rankings (Punktesumme, Wins, Races) inkl. Detail-Modal mit Statistik
12. Team-Standings (Punkte, Wins, Race-Entries — aggregiert aus Driver-Results)
13. Race-Liste (sortiert) mit Podium-Visualisierung
14. Multi-User: Memberships, Rollen (owner/admin/member), Invite-Codes
    *(in iOS-Port nicht enthalten — siehe Abschnitt 2)*
15. Auth: Registrierung, Login, Trusted Devices, Sessions, Passwort-Change
    *(in iOS-Port nicht enthalten)*
16. i18n DE / EN
17. Responsive UI (Desktop Pills-Nav, Mobile Bottom-Bar)

### 1.4 Datenmodell (aus `src/server/db/schema.ts`)

Relevant für die iOS-Portierung (Auth-Tabellen weggelassen):

```text
League
  id            UUID
  name          String
  description   String
  tracks        [String]              // JSON-Array
  createdAt     Date
  updatedAt     Date
  ├── Season (1:n)
  │     id          UUID
  │     leagueId    UUID
  │     name        String
  │     startDate   "YYYY-MM-DD"
  │     endDate     "YYYY-MM-DD"?
  │     isActive    Bool
  │     ├── Driver (1:n)
  │     │     id              UUID
  │     │     seasonId        UUID
  │     │     currentTeamId   UUID?
  │     │     name            String
  │     │     driverNumber    Int (default 0)
  │     └── Race (1:n)
  │           id        UUID
  │           seasonId  UUID
  │           name      String
  │           track     String
  │           date      "YYYY-MM-DD"
  │           ├── RaceResult (1:n)
  │           │     id           UUID
  │           │     raceId       UUID
  │           │     driverId     UUID
  │           │     teamId       UUID?
  │           │     position     Int
  │           │     points       Int        // berechnet
  │           │     lapTime      "MM:SS.mmm"?
  │           │     fastestLap   Bool
  │           │     dnf          Bool
  │           │     └── RaceResultPenalty (1:n)
  │           │           type   "seconds" | "grid" | "points"
  │           │           value  Int
  │           │           note   String?
  └── Team (1:n)
        id        UUID
        leagueId  UUID
        name      String
        isActive  Bool
```

**Punkte-System (Konstanten):**
```
1.→25  2.→18  3.→15  4.→12  5.→10  6.→8  7.→6  8.→4  9.→2  10.→1
+1 Bonus für Fastest Lap, sofern Top-10
DNF / Unknown Driver → 0 Punkte
Points-Strafe wird nach Berechnung abgezogen
```

### 1.5 Navigations-Flow

```
Login/Register (Auth-Wall)
        │
        ▼
   /liga (Liga-Liste)
        ├── /liga/new           (Liga anlegen)
        ├── /settings           (Profil)
        ├── /about
        └── /liga/[id]          (Liga-Detail)
              ├── /edit         (Liga bearbeiten)
              ├── /drivers      (Fahrer-CRUD)
              └── /race/new     (Rennen anlegen)
              └── /race/[id]    (Rennen-Detail)
                    └── /edit   (Rennen bearbeiten / löschen)
```

---

## 2. Übersicht der iOS-App

Native iPhone-App in **Swift + SwiftUI** mit **1:1-Portierung der Renn- &
League-Features** der Web-App. Auth- und Multi-User-Logik entfallen vollständig
(Single-User-App, "Sign in with Apple" wird **später** auf System-Ebene
nachgerüstet und ist hier nicht Teil des Plans).

**Wichtigste Änderungen gegenüber Web:**

- **Kein Backend / keine API / keine DB** → alle Daten liegen lokal in einer
  iCloud-Container-Datei und syncen automatisch zwischen Geräten desselben
  Apple-Accounts.
- **Single-User**: Member-Verwaltung, Rollen (owner/admin/member), Invite-Codes,
  Join-by-Code sind komplett entfernt. Alles, was auf der League sichtbar ist,
  ist editierbar — es gibt keine "Watcher".
- **Kein Login-Screen**, kein Profil-Screen mit Passwort/Sessions. `/settings`
  wird minimal auf App-Settings (Sprache override, Datenschutz-Link, About).
- **Navigation**: Web-Routen werden zu `NavigationStack`-Push-Pfaden. Mobile
  Bottom-Bar der Web-App entspricht der iOS-`TabView`.
- **Seasons bleiben 1:1** wie in der Web-App (mehrere pro Liga, aktive Season,
  optional Fahrer übernehmen).
- **Lokalisierung**: DE + EN über `Localizable.xcstrings` (String Catalog).
- **Mindest-Version: iOS 17** (Verfügbarkeit von `@Observable`, modernen
  SwiftUI-APIs, Großteil installierter Basis).

---

## 3. Mapping Web → iOS

| Web / React                            | iOS / SwiftUI                                              |
| -------------------------------------- | ---------------------------------------------------------- |
| Next.js Route (`/liga/[id]`)           | `NavigationStack` + `NavigationLink` / `navigationDestination(for:)` |
| `useRouter().push(...)`                | `path.append(value)` auf `NavigationPath`                  |
| `Modal` Component                      | `.sheet(isPresented:)` / `.sheet(item:)`                   |
| Confirmation-Modal (Delete)            | `.alert(...)` oder `.confirmationDialog(...)`              |
| `useState` / Component-State           | `@State`                                                   |
| Globaler Context (`LocaleContext`)     | `@Observable` Model in `.environment(...)`                 |
| API-Call (`api.leagues.list()`)        | `LeagueStore`-Methode → liest aus iCloud-Datei             |
| Drizzle ORM + MariaDB                  | `FileManager` + JSON `Codable` im `ubiquityContainerURL`   |
| `localStorage` (nicht genutzt)         | n/a                                                        |
| `useLocale().t("key")`                 | `String(localized: "key")` (String Catalog Lookup)         |
| Tailwind Klassen                       | SwiftUI Modifier + `Color`/`Font` Tokens                   |
| `lucide-react` Icons                   | `SF Symbols` (`Image(systemName:)`)                        |
| `<Input label=... />`                  | `TextField(...)` mit `.textFieldStyle(.roundedBorder)`     |
| `<Select>` (Dropdown)                  | `Picker(selection:)` (`.menu` oder `.navigationLink`)      |
| `<Table>`                              | `List` / `LazyVGrid` / `Grid`                              |
| Form-Validation via Zod                | Inline-Validation in `@Observable` ViewModel               |
| HTTP-Error Handling                    | Try/Catch + Domain-`enum AppError: Error`                  |
| Auth (NextAuth Sessions)               | **Entfällt** (später optional Sign in with Apple)          |
| League-Memberships / Invite-Codes      | **Entfällt** (Single-User per iCloud)                      |
| `process.env`                          | Build-Configs / `Info.plist`                               |
| `next/image` `/Kartixa.svg`            | `Image("Kartixa")` aus Asset Catalog (PDF/SVG)             |
| Desktop Pills + Mobile Bottom Bar      | Nur Bottom-Bar via `TabView`                               |

---

## 4. Tech-Stack iOS

- **UI:** SwiftUI (iOS 17+)
- **State:** `@Observable` (Observation Framework, iOS 17), `@State`, `@Bindable`
- **Persistenz:** `FileManager` + `Codable` (JSON) im
  `FileManager.default.url(forUbiquityContainerIdentifier:)`
- **iCloud:** iCloud Documents über `NSUbiquitousContainer` (Capability
  *iCloud → iCloud Documents*)
- **Konflikt-Handling:** `NSFileCoordinator` + `NSFilePresenter` für sicheren
  Mehrgeräte-Zugriff
- **Lokalisierung:** `Localizable.xcstrings` (String Catalog, Xcode 15+)
- **Icons:** SF Symbols
- **Logging:** `os.Logger`
- **Tests:** XCTest (mind. Snapshot der `PointsCalculator`-Logik)
- **Optional:** `Swift Charts` für Driver/Season-Statistiken (Nice-to-have)
- **Bewusst NICHT verwendet (für MVP):** SwiftData (vermeidet Migrations-Risiken
  zwischen iOS-Versionen, und JSON ist trivial zwischen Geräten zu syncen).

---

## 5. Xcode-Projektstruktur

```
Kartixa/
├── KartixaApp.swift                  // @main, Root NavigationStack/TabView
├── Resources/
│   ├── Assets.xcassets               // AppIcon, Kartixa-Logo (SVG/PDF)
│   ├── Localizable.xcstrings         // DE + EN (aus messages/de.json + en.json)
│   └── Info.plist                    // iCloud Container Entitlement Reference
├── Models/                           // Pure Codable Structs (Domain)
│   ├── League.swift
│   ├── Season.swift
│   ├── Team.swift
│   ├── Driver.swift
│   ├── Race.swift
│   ├── RaceResult.swift
│   ├── RaceResultPenalty.swift
│   └── PointsSystem.swift            // Konstanten + calculatePoints()
├── Persistence/
│   ├── iCloudStore.swift             // Wrapper um Ubiquity Container URL
│   ├── LeagueRepository.swift        // load/save/delete League-Datei
│   ├── FileCoordination.swift        // NSFileCoordinator-Helfer
│   └── Migration.swift               // Schema-Version Handling
├── Services/
│   ├── PointsCalculator.swift        // 1:1 Port von pointsCalculationService.ts
│   ├── DriverRankingService.swift    // Sortierung & Aggregation
│   └── TeamRankingService.swift      // Team-Standings-Aggregation
├── ViewModels/                       // @Observable
│   ├── LeagueListViewModel.swift
│   ├── LeagueDetailViewModel.swift
│   ├── DriversViewModel.swift
│   ├── RaceFormViewModel.swift
│   └── RaceDetailViewModel.swift
├── Views/
│   ├── Root/
│   │   ├── RootTabView.swift         // Leagues | About | Settings
│   │   └── AppRoot.swift
│   ├── Leagues/
│   │   ├── LeagueListView.swift
│   │   ├── NewLeagueView.swift
│   │   └── LeagueDetailView.swift
│   ├── League/
│   │   ├── EditLeagueView.swift
│   │   ├── DriversListView.swift
│   │   ├── DriverDetailSheet.swift
│   │   ├── DriverFormSheet.swift
│   │   ├── TeamStandingsView.swift
│   │   └── SeasonPicker.swift
│   ├── Races/
│   │   ├── RacesListView.swift
│   │   ├── NewRaceView.swift
│   │   ├── EditRaceView.swift
│   │   ├── RaceDetailView.swift
│   │   ├── RaceResultRowEditor.swift
│   │   ├── PenaltySheet.swift
│   │   └── PodiumView.swift
│   ├── About/
│   │   └── AboutView.swift
│   ├── Settings/
│   │   └── SettingsView.swift
│   └── Components/
│       ├── Card.swift
│       ├── PrimaryButton.swift
│       ├── LabeledTextField.swift
│       ├── MedalBadge.swift
│       └── PositionBadge.swift
└── Tests/
    ├── KartixaTests/
    │   ├── PointsCalculatorTests.swift
    │   ├── LeagueRepositoryTests.swift
    │   └── RankingServiceTests.swift
```

---

## 6. Datenmodell (Swift)

Eine League wird als **eine JSON-Datei** im iCloud-Container abgelegt:

```
<Ubiquity Container>/Documents/Leagues/<league-uuid>.kartixa.json
```

Damit ist eine League die natürliche Sync-Einheit; CloudKit handhabt das
File-by-File-Syncen automatisch.

### 6.1 Schema-Version

Jede Datei beginnt mit einer `schemaVersion`, damit zukünftige Migrationen
möglich sind:

```swift
struct LeagueFile: Codable {
    let schemaVersion: Int        // aktuell 1
    var league: League
}
```

### 6.2 Domain-Structs

```swift
import Foundation

struct League: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var description: String
    var tracks: [String]
    var teams: [Team]
    var seasons: [Season]
    let createdAt: Date
    var updatedAt: Date
}

struct Season: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var startDate: Date           // bei JSON: ISO 8601, im Modell Date
    var endDate: Date?
    var isActive: Bool
    var drivers: [Driver]
    var races: [Race]
}

struct Team: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var isActive: Bool
}

struct Driver: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var number: Int               // 0 = Unknown Driver Sentinel
    var currentTeamId: UUID?
}

struct Race: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var track: String
    var date: Date
    var results: [RaceResult]
}

struct RaceResult: Codable, Identifiable, Hashable {
    let id: UUID
    var driverId: UUID            // == Driver.id, oder UnknownDriver.id der Season
    var teamId: UUID?
    var position: Int
    var points: Int               // berechnet, beim Speichern gesetzt
    var lapTime: String?          // "MM:SS.mmm"
    var fastestLap: Bool
    var dnf: Bool
    var penalties: [RaceResultPenalty]
}

struct RaceResultPenalty: Codable, Identifiable, Hashable {
    let id: UUID
    var type: PenaltyType
    var value: Int
    var note: String?
}

enum PenaltyType: String, Codable, CaseIterable, Hashable {
    case seconds, grid, points
}
```

### 6.3 Punkteberechnung (1:1 Port)

```swift
enum PointsSystem {
    static let table: [Int: Int] = [
        1:25, 2:18, 3:15, 4:12, 5:10, 6:8, 7:6, 8:4, 9:2, 10:1
    ]
    static let fastestLapBonus = 1

    static func points(for position: Int, fastestLap: Bool) -> Int {
        let base = table[position] ?? 0
        let bonus = (fastestLap && position <= 10) ? fastestLapBonus : 0
        return base + bonus
    }
}

enum PointsCalculator {
    static func calculate(
        position: Int,
        fastestLap: Bool,
        isUnknownDriver: Bool,
        dnf: Bool,
        penalties: [RaceResultPenalty]
    ) -> Int {
        guard !isUnknownDriver, !dnf else { return 0 }
        let base = PointsSystem.points(for: position, fastestLap: fastestLap)
        let pointsPenalty = penalties
            .filter { $0.type == .points }
            .reduce(0) { $0 + $1.value }
        return base - pointsPenalty
    }
}
```

### 6.4 Datei-Namenskonvention im iCloud-Ordner

| Pfad                                                | Inhalt                          |
| --------------------------------------------------- | ------------------------------- |
| `Documents/Leagues/<uuid>.kartixa.json`             | Eine League (inkl. Seasons etc.)|
| `Documents/.kartixa-meta.json`                      | App-Settings / Last-Seen-Index  |
| `Documents/.trash/<uuid>.kartixa.json`              | Soft-Delete (30 Tage)           |

Endung `.kartixa.json` wird im `Info.plist` als Document Type registriert, damit
Files via "Öffnen in Kartixa" importiert werden können (Nice-to-have).

---

## 7. Screens

Jeder Screen unten ist direkt aus einer Web-Route gemappt. Auth- und
Mitglieder-Screens wurden gestrichen (siehe Abschnitt 2).

### 7.1 `RootTabView` (entspricht Navbar der Web-App)

- **Zweck:** Top-Level-Navigation
- **UI:** `TabView` mit drei Tabs
  - 🏁 **Leagues** → `LeagueListView` in `NavigationStack`
  - ℹ️ **About** → `AboutView`
  - ⚙️ **Settings** → `SettingsView`
- **Navigation:** Initial Tab = Leagues

### 7.2 `LeagueListView` (Web: `/liga`)

- **Zweck:** Liste aller Leagues, Neuanlage starten
- **UI:** `List` von `LeagueCard` (Name, Description, Driver-Count, Race-Count),
  `Button("Neue Liga")` in `.toolbar`
- **Empty-State:** Großer Call-to-Action mit Plus-Icon
- **Navigation:**
  - Tap → `LeagueDetailView(leagueId:)`
  - Plus → `.sheet(NewLeagueView)`
- **Entfernt:** Join-by-Code Karte (keine Multi-User-Logik)

### 7.3 `NewLeagueView` (Web: `/liga/new`)

- **Zweck:** Liga anlegen mit Tracks, Teams, Drivers
- **UI:** `Form` mit 4 Sections:
  1. Liga-Info (Name*, Beschreibung)
  2. Drivers (dynamische Liste, min. 1 Pflicht)
  3. Teams (optional)
  4. Tracks (dynamische Liste, min. 1 Pflicht)
- **Validierung:** Inline (Pflichtfelder rot)
- **Navigation:** `Cancel` (dismiss) / `Create` → erstellt Liga + Initial-Season
  → dismiss → öffnet automatisch `LeagueDetailView`

### 7.4 `LeagueDetailView` (Web: `/liga/[leagueId]`)

- **Zweck:** Übersicht einer Liga: Season-Auswahl, Driver-Rankings,
  Races-Liste, Team-Standings
- **UI:** `ScrollView` mit
  - Header (Name + Description + Edit-Button + "Neue Season")
  - `SeasonPicker` (`Picker` als Menü, plus Trash für aktuelle Season)
  - `DriverRankingsSection` (Top-Liste, Tap → `DriverDetailSheet`)
  - `RacesListSection` (Liste, Tap → `RaceDetailView`, Plus → `NewRaceView`)
  - `TeamStandingsSection`
- **Navigation:**
  - Edit → `EditLeagueView` (sheet/push)
  - Drivers verwalten → `DriversListView`
  - Race anlegen → `NewRaceView`
  - Race tap → `RaceDetailView`
- **Modals:**
  - Neue Season anlegen (Name, Startdatum, Checkbox "Fahrer übernehmen")
  - Season löschen bestätigen (deaktiviert wenn nur 1 Season)
- **Entfernt:** `InviteCodeManager`, `MemberManager`

### 7.5 `EditLeagueView` (Web: `/liga/[leagueId]/edit`)

- **Zweck:** Liga-Stammdaten bearbeiten
- **UI:** `Form` mit Sections League Details, Tracks (Add/Remove), Teams
  (Add/Remove), Info (Created, Total Drivers, Total Races)
- **Navigation:** Save → `path.removeLast()` zurück zur Liga

### 7.6 `DriversListView` (Web: `/liga/[leagueId]/drivers`)

- **Zweck:** Fahrer der aktuellen Season anlegen/bearbeiten/löschen
- **UI:** Tabelle/Liste sortiert nach Total Points, jeder Eintrag mit
  Rang-Badge (🥇🥈🥉), Name, Team, #, Races, Wins, Points; Swipe-Actions: Edit /
  Delete
- **Add:** `+` öffnet `DriverFormSheet`
- **Edit:** Tap auf Eintrag öffnet `DriverFormSheet`
- **Löschen:** Nur erlaubt, wenn `driver.races == 0`
- **Stats-Footer:** Total Drivers / Points / Race Entries / Wins

### 7.7 `DriverFormSheet`

- **Zweck:** Driver-Felder Name, Nummer, Team
- **UI:** `Form` (Sheet, `.medium` detent)
- **Validierung:** Name eindeutig pro Season

### 7.8 `DriverDetailSheet` (entspricht Modal in `DriverRankings.tsx`)

- **Zweck:** Statistik eines Fahrers (Total Points, Wins, Races Started, Win
  Rate, Avg Points/Race, Penalty-Historie)
- **UI:** Sheet, scrollbar

### 7.9 `NewRaceView` (Web: `/liga/[leagueId]/race/new`)

- **Zweck:** Rennen anlegen
- **UI:** `Form` mit Sections:
  1. Race Details (Name*, Track-Picker mit Custom-Option, Datum)
  2. Results (`ForEach` mit `RaceResultRowEditor`; Plus → Zeile hinzufügen)
  3. Punkte-System-Referenz (Read-Only Grid)
- **Result-Zeile:** Position-Badge mit ↑/↓-Buttons, Driver-Picker (inkl.
  "Unknown Driver"), Lap-Time-Input (nur wenn `fastestLap`), Punkte-Preview,
  Fastest-Lap-Toggle (genau 1), DNF-Toggle, Penalty-Button, Delete
- **DNF-Verhalten:** DNF-Zeilen werden ans Ende sortiert; Position wird
  automatisch neu nummeriert
- **Validierung:** Mind. 1 Result, jeder Driver gewählt, höchstens 1 Fastest Lap
- **Navigation:** Save → Race-Detail des neuen Rennens

### 7.10 `RaceDetailView` (Web: `/liga/[leagueId]/race/[raceId]`)

- **Zweck:** Read-Only Anzeige eines Rennens
- **UI:** Stats-Grid (Teilnehmer, Winner, Total Points, Fastest Lap),
  Result-Tabelle sortiert nach Position, Podium-Visualisierung bei ≥3 Finishern
- **Navigation:** Edit-Toolbar-Button → `EditRaceView`

### 7.11 `EditRaceView` (Web: `/liga/[leagueId]/race/[raceId]/edit`)

- Wie `NewRaceView`, aber mit Initial-State + Danger-Zone-Section zum Löschen
  (`.alert` Confirm)

### 7.12 `AboutView` (Web: `/about`)

- **Zweck:** Vorstellung, Features, Punktesystem, Tech-Stack-Hinweis
- **UI:** `ScrollView` mit statischen Cards, Punktesystem als `LazyVGrid`

### 7.13 `SettingsView` (Web: `/settings`, stark reduziert)

- **Zweck:** App-Einstellungen
- **UI:** `Form`-Sections:
  - **Sprache:** System / DE / EN (override `UserDefaults`)
  - **iCloud-Status:** "Aktiv / Inaktiv" Badge + Link zum System-Settings
  - **Daten:** Anzahl Leagues, "Liga exportieren" (ShareSheet auf JSON-Datei)
  - **Über:** Version, Datenschutz-Link, About-Link
- **Entfernt:** Profil-Name, Email, Sessions, Passwort-Change, Leave/Delete
  League (Delete bleibt — aber kontextuell auf `LeagueDetailView`)

---

## 8. Feature-Liste

Priorisiert für die iOS-Portierung.

### MVP (v1.0 — erste Release)

1. **F-01** Liga anlegen, anzeigen, bearbeiten, löschen
2. **F-02** Tracks pro Liga verwalten
3. **F-03** Teams pro Liga verwalten (aktiv/inaktiv)
4. **F-04** Seasons pro Liga (anlegen, aktive markieren, löschen)
5. **F-05** Beim Anlegen einer Season: Driver-Übernahme aus letzter Season
6. **F-06** Drivers pro Season (Add/Edit/Delete inkl. Name, Nummer, Team)
7. **F-07** Race anlegen mit Results (Position, Driver, Lap-Time, Fastest Lap, DNF)
8. **F-08** "Unknown Driver"-Platzhalter (0 Punkte, nicht in Rankings)
9. **F-09** Penalties: `seconds` / `grid` / `points` mit Notiz
10. **F-10** Automatische Punkteberechnung inkl. Fastest-Lap-Bonus & Points-Strafe
11. **F-11** Race anzeigen (inkl. Podium ab 3 Finishern)
12. **F-12** Race bearbeiten / löschen
13. **F-13** Driver-Rankings + Detail-Sheet mit Statistik & Penalty-Historie
14. **F-14** Team-Standings (Punkte, Wins, Race-Entries)
15. **F-15** iCloud-Persistenz (Lese/Schreibe) inkl. File-Coordination
16. **F-16** Lokalisierung DE + EN
17. **F-17** Tab-Navigation (Leagues / About / Settings)

### v1.1 (Komfort)

18. **F-18** Swipe-Actions (Liga, Race, Driver löschen direkt aus Liste)
19. **F-19** Pull-to-Refresh (manuelles Re-Reading der iCloud-Datei)
20. **F-20** Soft-Delete + 30-Tage-Papierkorb (`.trash`-Ordner)
21. **F-21** Sprache-Override in Settings
22. **F-22** iCloud-Status-Banner bei Offline / iCloud aus
23. **F-23** Daten-Backup-Export (JSON via ShareSheet)
24. **F-24** Empty-States verbessert (illustrierte SF-Symbols + Hint)
25. **F-25** Driver-Detail um Punkte-Verlauf pro Race ergänzen

### Nice-to-have (v1.2+)

26. **F-26** `Swift Charts`: Punkte-Verlauf pro Driver über Season
27. **F-27** Widgets (Driver-Standings auf Home Screen)
28. **F-28** Dark Mode Feinschliff
29. **F-29** iPad-Layout (Split View)
30. **F-30** Apple Watch Begleit-App (Read-Only Standings)
31. **F-31** Document Type: Liga-Datei aus Files-App in Kartixa importieren
32. **F-32** Sign in with Apple + CloudKit Sharing (Multi-User, separater Track)

---

## 9. iCloud-Setup

### 9.1 Apple Developer Voraussetzungen

1. Apple Developer Account (kostenpflichtig)
2. App-ID `com.dein-prefix.kartixa` mit Capability **iCloud → CloudKit + iCloud
   Documents**
3. iCloud-Container `iCloud.com.dein-prefix.kartixa` anlegen (im Developer
   Portal oder direkt in Xcode)

### 9.2 Xcode Capabilities (Signing & Capabilities Tab)

- ➕ **iCloud**
  - Services: ✅ iCloud Documents
  - Containers: ✅ `iCloud.com.dein-prefix.kartixa`
- ➕ **Background Modes** (optional, aber empfohlen)
  - ✅ Background fetch (für Sync-Hint nach Wiederherstellung)

### 9.3 Entitlements (automatisch von Xcode generiert)

`Kartixa.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
"http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.icloud-container-identifiers</key>
    <array>
        <string>iCloud.com.dein-prefix.kartixa</string>
    </array>
    <key>com.apple.developer.icloud-services</key>
    <array>
        <string>CloudDocuments</string>
    </array>
    <key>com.apple.developer.ubiquity-container-identifiers</key>
    <array>
        <string>iCloud.com.dein-prefix.kartixa</string>
    </array>
</dict>
</plist>
```

### 9.4 `Info.plist` Ergänzungen

```xml
<key>NSUbiquitousContainers</key>
<dict>
    <key>iCloud.com.dein-prefix.kartixa</key>
    <dict>
        <key>NSUbiquitousContainerIsDocumentScopePublic</key>
        <true/>
        <key>NSUbiquitousContainerSupportedFolderLevels</key>
        <string>Any</string>
        <key>NSUbiquitousContainerName</key>
        <string>Kartixa</string>
    </dict>
</dict>
```

### 9.5 Lese-/Schreib-Helper (Code-Snippet)

```swift
import Foundation

enum iCloudStore {
    static let containerID = "iCloud.com.dein-prefix.kartixa"
    static let leaguesFolder = "Leagues"

    /// URL des Documents-Ordners im iCloud-Container.
    /// Nil = iCloud nicht verfügbar (User nicht eingeloggt o. ä.).
    static func documentsURL() -> URL? {
        guard let container = FileManager.default
            .url(forUbiquityContainerIdentifier: containerID) else {
            return nil
        }
        let docs = container.appendingPathComponent("Documents", isDirectory: true)
        try? FileManager.default.createDirectory(
            at: docs, withIntermediateDirectories: true
        )
        return docs
    }

    static func leaguesURL() -> URL? {
        guard let docs = documentsURL() else { return nil }
        let folder = docs.appendingPathComponent(leaguesFolder, isDirectory: true)
        try? FileManager.default.createDirectory(
            at: folder, withIntermediateDirectories: true
        )
        return folder
    }
}

struct LeagueRepository {
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        return e
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    /// Alle Leagues lesen (file-by-file).
    func loadAll() throws -> [League] {
        guard let folder = iCloudStore.leaguesURL() else {
            throw RepoError.iCloudUnavailable
        }
        let urls = try FileManager.default.contentsOfDirectory(
            at: folder, includingPropertiesForKeys: nil
        ).filter { $0.pathExtension == "json" }

        return try urls.map { try readCoordinated(at: $0) }
            .sorted(by: { $0.createdAt < $1.createdAt })
    }

    /// League speichern (atomar, koordiniert).
    func save(_ league: League) throws {
        guard let folder = iCloudStore.leaguesURL() else {
            throw RepoError.iCloudUnavailable
        }
        let file = folder.appendingPathComponent("\(league.id.uuidString).kartixa.json")
        let payload = LeagueFile(schemaVersion: 1, league: league)
        let data = try encoder.encode(payload)
        try writeCoordinated(data: data, to: file)
    }

    /// League löschen.
    func delete(_ leagueID: UUID) throws {
        guard let folder = iCloudStore.leaguesURL() else { return }
        let file = folder.appendingPathComponent("\(leagueID.uuidString).kartixa.json")
        var coordError: NSError?
        NSFileCoordinator().coordinate(
            writingItemAt: file, options: .forDeleting, error: &coordError
        ) { url in
            try? FileManager.default.removeItem(at: url)
        }
    }

    private func readCoordinated(at url: URL) throws -> League {
        var coordError: NSError?
        var result: Result<League, Error> = .failure(RepoError.unknown)
        NSFileCoordinator().coordinate(
            readingItemAt: url, options: [], error: &coordError
        ) { url in
            do {
                let data = try Data(contentsOf: url)
                let file = try decoder.decode(LeagueFile.self, from: data)
                result = .success(file.league)
            } catch {
                result = .failure(error)
            }
        }
        if let coordError { throw coordError }
        return try result.get()
    }

    private func writeCoordinated(data: Data, to url: URL) throws {
        var coordError: NSError?
        var writeError: Error?
        NSFileCoordinator().coordinate(
            writingItemAt: url, options: .forReplacing, error: &coordError
        ) { url in
            do {
                try data.write(to: url, options: [.atomic])
            } catch {
                writeError = error
            }
        }
        if let coordError { throw coordError }
        if let writeError { throw writeError }
    }

    enum RepoError: Error { case iCloudUnavailable, unknown }
}
```

### 9.6 iCloud-Verfügbarkeit prüfen (App-Start)

```swift
import Foundation

enum iCloudAvailability {
    static var isSignedIn: Bool {
        FileManager.default.ubiquityIdentityToken != nil
    }
}
```

In `KartixaApp.init()` einmalig prüfen und in `@Observable` `AppState` halten;
ein Banner einblenden, falls `false`.

---

## 10. Edge Cases

| Szenario                               | Behandlung                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **iCloud deaktiviert / abgemeldet**    | Beim Start: Banner "iCloud nicht aktiv — Daten werden nicht synchronisiert". Lese/Schreibe via lokalen Fallback-Ordner (`FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first`). Beim Reaktivieren: Migration ins iCloud-Verzeichnis. |
| **Offline**                            | iCloud-Datei wird beim nächsten Online-Werden automatisch hochgeladen. Kein extra Code nötig, aber `NSMetadataQuery` überwacht ggf. den Sync-Status. |
| **Sync-Konflikt (zwei Geräte editieren parallel)** | `NSFileCoordinator` serialisiert Zugriffe pro Datei. Da jede Liga eine eigene Datei ist, sind Konflikte selten. Bei tatsächlichem Konflikt: `NSFileVersion.unresolvedConflictVersions(of:)` prüfen, neueren `updatedAt`-Timestamp gewinnt, alte Version optional als Backup in `.trash` abgelegt. |
| **Erster App-Start**                   | `Leagues/`-Ordner ist leer → Empty-State + Onboarding-Card "Erste Liga anlegen". Keine Seed-Daten.                  |
| **Daten-Migration (Schema v1 → v2)**  | Beim Lesen `schemaVersion` prüfen. `Migration.swift` mapped alte auf neue Structs. Bei nicht unterstützter Version: Datei in `.trash` verschieben + User informieren ("Update der App nötig"). |
| **Korrupte Datei**                     | `try? readCoordinated(...)` → Fehlende Datei wird übersprungen, geloggt via `os.Logger`. Datei in `.trash` mit Suffix `.corrupt`. |
| **Driver mit Race-Einträgen löschen**  | UI blockiert Löschen (wie Web). Nur Drivers ohne `RaceResult` löschbar.                                              |
| **Letzte Season löschen**              | Verboten (Button disabled), exakt wie Web.                                                                          |
| **DNF-Reihenfolge**                    | Beim Validate/Save: DNFs ans Ende, Positionen neu nummerieren (`normalizeResultsWithDnf`-Logik portieren).          |
| **Lap-Time ohne Fastest Lap**         | Lap-Time-Feld wird ausgeblendet, Wert geleert (wie Web).                                                            |
| **Fastest Lap > 1 markiert**          | Toggle erzwingt Exklusivität (nur einer kann gleichzeitig).                                                         |
| **Unknown Driver dupliziert**         | Pro Season nur eine "Unknown Driver"-Instanz (Sentinel-UUID); mehrere Verwendungen in einem Race werden über Token, nicht über Driver-Datensatz gelöst. |
| **Liga ohne Tracks**                   | Validation beim Anlegen/Bearbeiten: mind. 1 Track Pflicht.                                                          |
| **Datum in der Zukunft**              | `DatePicker` hat `in: ...Date()`-Range, wie Web (max heute).                                                        |
| **Großer Datenbestand**               | Bei > 50 Leagues: `LazyVStack` statt `VStack`, Leseroutine streamen.                                                |
| **Tippfehler im Driver-Namen (Eindeutigkeit)** | Validate vor Save: case-insensitive Vergleich auf bestehende Drivers der Season (1:1 wie Web).                |

---

## 11. Umsetzungs-Roadmap

Bauen in dieser Reihenfolge — jeder Schritt liefert ein lauffähiges Zwischenziel.

### Phase 0 — Projekt-Setup

- [ ] Xcode-Projekt anlegen: "Kartixa", SwiftUI, iOS 17.0 Deployment Target
- [ ] Git-Init, `.gitignore` mit Xcode-Defaults
- [ ] Asset Catalog: Kartixa-Logo (aus `public/Kartixa.svg`) als PDF importieren
- [ ] App-Icon erstellen / Platzhalter
- [ ] String Catalog `Localizable.xcstrings` anlegen, DE + EN-Locale aktivieren
- [ ] Initial-Keys aus `messages/de.json` + `messages/en.json` portieren
- [ ] Folder-Struktur (siehe Abschnitt 5) anlegen

### Phase 1 — Datenmodell + Persistenz

- [ ] `Models/` Structs anlegen (League, Season, Team, Driver, Race, …)
- [ ] `PointsSystem.swift` + `PointsCalculator.swift` portieren
- [ ] `Persistence/iCloudStore.swift` (Container-URL)
- [ ] `Persistence/LeagueRepository.swift` mit Read/Write/Delete + NSFileCoordinator
- [ ] iCloud Capability + Entitlements aktivieren
- [ ] Unit-Tests:
  - [ ] `PointsCalculatorTests` (alle Web-Edgecases: DNF, Unknown, Fastest Lap, Points-Penalty)
  - [ ] `LeagueRepositoryTests` (Round-Trip mit Temp-Verzeichnis statt iCloud)

### Phase 2 — App-Skelett + Navigation

- [ ] `KartixaApp.swift`, `RootTabView` mit drei Tabs
- [ ] `AppState` (`@Observable`) mit iCloud-Verfügbarkeit
- [ ] `AboutView` statisch implementieren
- [ ] `SettingsView` statisch (Sprache, iCloud-Status, Version)

### Phase 3 — League-CRUD

- [ ] `LeagueListViewModel` lädt aus Repository
- [ ] `LeagueListView` zeigt Liste + Empty State
- [ ] `NewLeagueView` (Form mit Tracks, Teams, Drivers, Validierung)
- [ ] Save → schreibt JSON-Datei, navigiert zur Detailansicht
- [ ] `LeagueDetailView` (Read-Only-Skelett mit Season-Picker)
- [ ] `EditLeagueView` (Stammdaten + Tracks + Teams editieren)
- [ ] Liga löschen (Confirmation `.alert`)

### Phase 4 — Seasons

- [ ] Initial-Season beim Anlegen einer Liga erzeugen
- [ ] Neue Season anlegen (Modal: Name, Startdatum, "Fahrer übernehmen")
- [ ] Aktive Season markieren (nur 1 aktiv pro Liga)
- [ ] Season löschen (gesperrt, wenn nur 1 Season)

### Phase 5 — Drivers

- [ ] `DriversViewModel` (CRUD pro Season)
- [ ] `DriversListView` (sortiert nach Points, Swipe-Actions)
- [ ] `DriverFormSheet` (Name, Nummer, Team)
- [ ] Validierung: Name eindeutig pro Season, Nummer 1–999
- [ ] Löschen nur wenn `races == 0` (Button disabled mit Tooltip-Erklärung)
- [ ] `DriverDetailSheet` (Statistik + Penalty-Historie)

### Phase 6 — Races

- [ ] `RaceFormViewModel` mit Result-Array & Validation
- [ ] `NewRaceView` Layout: Name, Track-Picker (inkl. Custom), Date
- [ ] `RaceResultRowEditor` mit Position-Badge, Driver-Picker, Lap-Time, FL, DNF
- [ ] ↑/↓-Sortierung + `normalizeResultsWithDnf` portieren
- [ ] `PenaltySheet` (Type, Value, Note)
- [ ] Punkte-Preview live während Eingabe
- [ ] Validation: ≥1 Result, jeder Driver gewählt, ≤1 FL
- [ ] Save → ruft `PointsCalculator` für jedes Result → persist
- [ ] `RaceDetailView` (Stats, Tabelle, Podium)
- [ ] `EditRaceView` (gleiche Form, Initial-State) + Danger-Zone-Delete

### Phase 7 — Rankings & Standings

- [ ] `DriverRankingService` (Sortierung, Wins-Zählung, Avg-Berechnung)
- [ ] `TeamRankingService` (Aggregation aus RaceResults)
- [ ] `DriverRankingsSection` in `LeagueDetailView`
- [ ] `TeamStandingsSection` in `LeagueDetailView`
- [ ] `RacesListSection` in `LeagueDetailView`

### Phase 8 — Lokalisierung & Polish

- [ ] Alle Strings durch `String(localized:)` ersetzen
- [ ] DE + EN vollständig im String Catalog
- [ ] Empty-States, Loading-States, Error-Toasts
- [ ] Medal-Badges (🥇🥈🥉) via `Text` oder SF Symbol
- [ ] Dark Mode quertesten

### Phase 9 — Edge Cases + v1.1-Features

- [ ] iCloud-Status-Banner
- [ ] Sync-Konflikt-Handling via `NSFileVersion`
- [ ] Schema-Versionierung + Migration-Pipeline
- [ ] Soft-Delete in `.trash`
- [ ] Pull-to-Refresh
- [ ] ShareSheet-Export einer League als JSON
- [ ] Manuelles Re-Read nach Foreground

### Phase 10 — Release-Vorbereitung

- [ ] Privacy-Manifest (`PrivacyInfo.xcprivacy`)
- [ ] App-Store-Screenshots (iPhone 15 Pro, 6.7", 6.1")
- [ ] App-Store-Beschreibung (DE + EN)
- [ ] TestFlight Beta mit ≥3 Geräten testen (insb. iCloud-Sync auf 2 Geräten)
- [ ] Datenschutz-Erklärung verlinkt
- [ ] App Review Notes (erklären: keine Server-Komponente, alle Daten lokal/iCloud)
- [ ] Versionierung `1.0.0` + Build-Number-Strategie
- [ ] Release einreichen

---

## Anhang A — Web-Strings, die übersetzt werden müssen

Die wichtigsten Übersetzungs-Namespaces aus `messages/de.json` /
`messages/en.json` zum Übernehmen in das String Catalog:

- `nav.*` (Leagues, About, Settings)
- `leagues.*` (Title, Subtitle, Empty, CreateNew, Drivers, Races)
- `league.*` (Edit, NewSeason, SeasonLabel, DriverRankings, TeamRankings, …)
- `season.*` (Create, Delete, NameLabel, StartDate, CopyDrivers, …)
- `drivers.*` (Add, Manage, NameRequired, NameExists, InvalidNumber, …)
- `race.*` / `newRace.*` / `raceExtras.*` (Position, Driver, LapTime, DNF, …)
- `penalties.*` (Button, AddTitle, TypeLabel, OptionSeconds / Grid / Points, …)
- `common.*` (Cancel, Save, Delete, Edit, Retry, …)

**Nicht** zu portieren (entfallen mit Auth/Multi-User):
- `register.*`, `login.*`, `resetPassword.*`
- `leagues.joinCode.*`
- `settings.password.*`, `settings.sessions.*`
- `members.*`, `inviteCodes.*`

---

## Anhang B — Was bewusst NICHT in v1.0 ist

Damit du beim Bauen nicht in Scope Creep gerätst:

- ❌ Sign in with Apple / iCloud Sharing zwischen Personen (späterer Track)
- ❌ Push Notifications
- ❌ Live Activities
- ❌ Apple Watch
- ❌ Widgets
- ❌ Backup/Restore aus Files-App
- ❌ Markdown-/Rich-Text-Notizen in Penalties
- ❌ CSV-Import/Export
- ❌ Statistik-Charts (kommt mit Swift Charts in v1.2)

