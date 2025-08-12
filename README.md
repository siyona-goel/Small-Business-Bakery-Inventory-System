# 🧁 Small-Business-Bakery-Inventory-System

A full-stack inventory management system tailored for small home bakeries. Built with **Flask** for the backend and **React** for the frontend, this app helps bakers manage ingredients, track baking history, monitor low-stock items, and store and define recipes with precision.

## 🍰 Features
- ✔️ View, add, and edit ingredients (with quantity and unit)
- ✔️ Track ingredient stock and highlight low-stock items
- ✔️ Bake items from predefined (saved) recipes (auto-subtracts ingredients from stock)
- ✔️ Create and manage recipes dynamically
- ✔️ View baking history (timestamped logs)
- ✔️ A dashboard overview with quick insights (total ingredients, low-stock items, items baked today, last baked item, baking trends & recent baking activity)
- ✔️ Persistent data storage using local JSON files

## ⚙️ Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Flask (Python) + Flask-CORS
- **Persistence:** JSON files (`data.json`, `history.json`, `recipes.json`)
- **Dev Tools:** Cursor, Git, VS Code, WSL (Ubuntu), GitHub

## 📦 Project Structure
```
Small-Business_Bakery_Inventory_System/
├── app.py           # Main Flask backend logic
├── data.json        # Ingredient data
├── history.json     # Baking history
├── recipes.json     # Recipes
├── requirements.txt # Python dependencies
├── README.md
├── images/          # Images for README
│
├── frontend/        # React frontend
│ ├── src/           # Frontend source code
│ ├── public/        # Static assets
│ ├── .gitignore
│ ├── README.md
│ ├── eslint.config.js
│ ├── index.html
│ ├── package-lock.json
│ ├── package.json
│ ├── vite.config.js
```

## 🧪 How to Run Locally
```bash
### 1. Clone the Repository
git clone https://github.com/siyonaaa/Small-Business-Bakery-Inventory-System.git
cd Small-Business-Bakery-Inventory-System

### 2. Setup the Backend (Flask)
python3 -m venv venv
source venv/bin/activate           # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cd app
python app.py

### 3. Setup the Frontend (React)
cd frontend
npm install
npm run dev
```
## 🙌 Acknowledgements
Built with love to support small business owners and home bakers.

## ✨ End-Product

- The Landing Page
![Alt text](images/1.png)

- The Inventory Page: View all your current ingredients in stock and add new ingredients
![Alt text](images/2.png)

- Filter the list to show only the current items running low in stock
![Alt text](images/3.png)

- Select an ingredient to see its details
![Alt text](images/4.png)

- Edit an ingredient's details
![Alt text](images/5.png)

- Record what you're about to bake based on your previously defined recipes or add a new recipe
![Alt text](images/6.png)

- Alerts you if you try to bake an item which uses ingredients that are currently low in stock
![Alt text](images/7.png)

- When you successfully bake an item
![Alt text](images/8.png)

- The Dashboard Page
![Alt text](images/9.png)
![Alt text](images/10.png)
![Alt text](images/11.png)
