# Zendesk Omnichannel Routing (OCR) Simulator

An interactive, visual simulator built with React to demonstrate how **Zendesk Omnichannel Routing (OCR)** works in real time—from the moment a customer submits a request across any channel to the moment an eligible agent is automatically assigned the ticket based on status, capacity, and skills.

> ℹ️ **Reference Documentation**  
> This simulator is based on official Zendesk omnichannel routing specifications and concepts:  
> [About omnichannel routing - Zendesk Help Center](https://support.zendesk.com/hc/en-us/articles/4409149119514-About-omnichannel-routing)

---

## 🚀 Features

- **Visual 7-Step Diagram Mode (Simple View):**
  - High-level, interactive workflow diagram illustrating the ticket lifecycle:
    1. Ticket Created / Updated
    2. OCR Eligibility Evaluation
    3. Group Assignment & Queues
    4. Capacity Rules Check
    5. Agent Status & Availability
    6. Skills Match Evaluation
    7. Automatic Assignment & Capacity Deduction
- **Extended Simulator Lab (Advanced View):**
  - Interactive simulation console with live agent roster, capacity counters, queue management, and step-by-step routing decision traces.
- **Preconfigured Real-World Scenarios (Select dropdown):**
  - **Email Tier 1:** Fast routing to agents with available email capacity.
  - **VIP Messaging:** Strict priority routing for high-value customers.
  - **Skills-Based Routing:** Language and skill filtering (e.g., Billing & Spanish).
  - **All Agents at Capacity:** Demonstration of queueing behavior when no eligible agent has capacity.
  - **Agent Offline / Away:** Re-routing or queue hold when agents are unavailable.
- **Bilingual Interface:** Instant toggling between **English** and **Spanish**.
- **Theme Switcher:** Clean **Dark** and **Light** modes with high-contrast, modern square UI styling.
- **Frontend Only:** Runs 100% in the browser with zero backend requirements or third-party tracking.

---

## 🛠️ Tech Stack

- **React 18**
- **Vite**
- **Lucide Icons**
- Pure CSS with CSS custom properties for theming

---

## 💻 Getting Started Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- `npm` or `yarn`

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Grjhoan/zen_ocr_simulator.git
   cd zen_ocr_simulator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

### Production Build

To generate an optimized production bundle:
```bash
npm run build
```

---

## 📬 Contact & Author

Created by **Jhoan Zabala**:

- **Email:** [jzabalacx@gmail.com](mailto:jzabalacx@gmail.com)
- **Website:** [www.jhoanzabala.com](https://www.jhoanzabala.com)
- **LinkedIn:** [https://www.linkedin.com/in/jhoanzabala/](https://www.linkedin.com/in/jhoanzabala/)

---

## 📄 License

This project is licensed under the MIT License - feel free to use and modify for learning, demonstration, and training purposes.
