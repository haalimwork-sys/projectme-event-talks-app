# 📊 BigQuery Release Notes Explorer

A premium, modern web dashboard application to explore, search, and filter Google Cloud BigQuery release notes. Built using Python Flask on the backend and custom vanilla glassmorphic HTML/CSS/JS on the frontend.

![Theme Accent](https://img.shields.io/badge/Theme-Quantum%20Nebula-blueviolet?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Python-Flask-3b82f6?style=for-the-badge&logo=python&logoColor=white)
![Frontend](https://img.shields.io/badge/Vanilla-HTML%20%7C%20CSS%20%7C%20JS-06b6d4?style=for-the-badge&logo=javascript&logoColor=white)

---

## ✨ Features

- **🚀 Live Feed Integration**: Fetches release notes directly from the official Google Cloud BigQuery XML feed.
- **⚡ Resilient Caching**: Implements local XML feed caching to maximize performance and prevent rate limiting. Automatically falls back to cache on connection timeouts.
- **🔍 Granular Split & Badges**: Splits single day updates by header tags, presenting them as individual categorized notes (e.g., *Feature*, *Issue*, *Fixed*, *Announcement*, *Deprecated*) with custom semantic badges.
- **🎨 Glassmorphic Styling**: Powered by the "Quantum Nebula" dark theme featuring animated background blobs, responsive layout grids, customized code snippets, and structured timelines.
- **🎛️ Advanced Control Center**: Includes instant search (debounced), tags filters, order sorting, and interactive stat indicators.
- **🔔 Toast Alert System**: Prompts interactive slide toast notifications detailing network connection status and sync outcomes.

---

## 🛠️ Technology Stack

- **Backend**:
  - **Python Flask**: Simple and fast web serving layer.
  - **Requests**: Handled with browser User-Agent emulation to prevent Google Cloud endpoint connection drops.
  - **BeautifulSoup4**: HTML parsing for granular node extraction.
- **Frontend**:
  - **HTML5 & CSS3**: Custom CSS variables, radial background glow filters, and responsive layout grids.
  - **Modern Javascript**: Reactive UI state binding, search debouncing, and value count-up animations.
  - **Icons & Typography**: FontAwesome 6 + Google Fonts (Plus Jakarta Sans & JetBrains Mono).

---

## 📂 Project Structure

```text
bq-releases-notes/
│
├── venv/                   # Python virtual environment (ignored in VCS)
├── static/
│   ├── css/
│   │   └── style.css       # Custom glassmorphism stylesheet
│   └── js/
│       └── app.js          # App actions, filtering, and animation logic
│
├── templates/
│   └── index.html          # Dashboard HTML view shell
│
├── app.py                  # Core Flask server, routing, and feed parser
├── feed_cache.xml          # Local XML feed cache (ignored in VCS)
├── requirements.txt        # Package dependencies list
├── .gitignore              # VCS exclude rules
└── README.md               # Project documentation
```

---

## 🏁 Local Installation & Setup

Follow these steps to run the application locally on your system:

### 1. Prerequisites
Ensure you have **Python 3.8+** installed.

### 2. Clone the Repository
```bash
git clone https://github.com/haalimwork-sys/projectme-event-talks-app.git
cd projectme-event-talks-app
```

### 3. Initialize & Activate Virtual Environment
* **Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
* **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Launch the Server
```bash
python app.py
```

### 6. Open Web Client
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📄 License
This project is open-source and available under the MIT License.
