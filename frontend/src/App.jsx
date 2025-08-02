import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import BakeItem from "./components/BakeItem";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import "./App.css";

// RecipeForm component for creating and saving new recipes
function RecipeForm({ onRecipeSaved }) {
  const [recipeName, setRecipeName] = useState("");
  const [ingredients, setIngredients] = useState([
    { name: "", amount: "", unit: "grams" },
  ]);
  const [message, setMessage] = useState(null);
  const unitOptions = ["grams", "kg", "ml", "litres", "units"];

  const handleIngredientChange = (idx, field, value) => {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === idx ? { ...ing, [field]: value } : ing
      )
    );
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", unit: "grams" }]);
  };

  const handleRemoveIngredient = (idx) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    // Validate
    if (!recipeName.trim()) {
      setMessage({ type: "error", text: "Recipe name is required." });
      return;
    }
    if (ingredients.length === 0 || ingredients.some(ing => !ing.name.trim() || !ing.amount || !ing.unit)) {
      setMessage({ type: "error", text: "All ingredient fields are required." });
      return;
    }
    // Build payload
    const ingredientsObj = {};
    for (const ing of ingredients) {
      ingredientsObj[ing.name.trim()] = {
        amount: Number(ing.amount),
        unit: ing.unit
      };
    }
    const payload = {
      recipe_name: recipeName.trim(),
      ingredients: ingredientsObj
    };
    try {
      const res = await fetch("http://localhost:5000/add-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to save recipe.");
      }
      setMessage({ type: "success", text: "Recipe saved successfully!" });
      setRecipeName("");
      setIngredients([{ name: "", amount: "", unit: "grams" }]);
      if (onRecipeSaved) onRecipeSaved();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="recipe-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        type="text"
        placeholder="Recipe Name"
        value={recipeName}
        onChange={e => setRecipeName(e.target.value)}
        required
      />
      <div>
        <h4>Ingredients</h4>
        {ingredients.map((ing, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Ingredient Name"
              value={ing.name}
              onChange={e => handleIngredientChange(idx, 'name', e.target.value)}
              required
              style={{ flex: 2 }}
            />
            <input
              type="number"
              placeholder="Amount"
              value={ing.amount}
              min="0"
              step="any"
              onChange={e => handleIngredientChange(idx, 'amount', e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <select
              value={ing.unit}
              onChange={e => handleIngredientChange(idx, 'unit', e.target.value)}
              style={{ flex: 1 }}
            >
              {unitOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <button type="button" onClick={() => handleRemoveIngredient(idx)} disabled={ingredients.length === 1} style={{ flex: 'none' }}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={handleAddIngredient} style={{ marginTop: 8 }}>
          Add Ingredient
        </button>
      </div>
      <button type="submit">Save Recipe</button>
      {message && (
        <div style={{ color: message.type === 'success' ? 'green' : 'red', marginTop: 8 }}>
          {message.text}
        </div>
      )}
    </form>
  );
}

function InventoryPage() {
  const [ingredients, setIngredients] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [lowStock, setLowStock] = useState("");
  const [displayedIngredients, setDisplayedIngredients] = useState([]);
  const [showingLowStock, setShowingLowStock] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [refreshRecipes, setRefreshRecipes] = useState(0);

  // Move all the existing App component logic here
  useEffect(() => {
    fetch("http://localhost:5000/ingredients")
      .then((res) => res.json())
      .then((data) => {
        setIngredients(data);
        setDisplayedIngredients(data);
      });
  }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    const newIngredient = { name, quantity, unit, low_stock_threshold: lowStock};

    fetch("http://localhost:5000/ingredients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newIngredient),
    })
      .then((res) => res.json())
      .then(() => {
        // Fetch the updated ingredients list from the backend
        fetch("http://localhost:5000/ingredients")
          .then((res) => res.json())
          .then((data) => {
            setIngredients(data);
            setDisplayedIngredients(data);
          });
        setName("");
        setQuantity("");
        setUnit("");
        setLowStock("");
      });
  };

  const handleShowLowStock = () => {
    setDisplayedIngredients(
      ingredients.filter(
        (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
      )
    );
    setShowingLowStock(true);
  };

  const handleShowAll = () => {
    setDisplayedIngredients(ingredients);
    setShowingLowStock(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const nameForUrl = encodeURIComponent(editingIngredient.originalName.toLowerCase());

    try {
      const response = await fetch(`http://localhost:5000/ingredients/${nameForUrl}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingIngredient.name,
          quantity: Number(editingIngredient.quantity),
          unit: editingIngredient.unit,
          low_stock_threshold: Number(editingIngredient.low_stock_threshold),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ingredient');
      }

      // Fetch the full ingredients list to ensure we have the latest data
      const refreshResponse = await fetch("http://localhost:5000/ingredients");
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh ingredients');
      }

      const freshIngredients = await refreshResponse.json();
      
      // Update all relevant states with the fresh data
      setIngredients(freshIngredients);
      
      if (showingLowStock) {
        setDisplayedIngredients(
          freshIngredients.filter(
            (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
          )
        );
      } else {
        setDisplayedIngredients(freshIngredients);
      }

      // Update selected ingredient if necessary
      if (selectedIngredient?.name === editingIngredient.originalName) {
        const updatedSelected = freshIngredients.find(
          (ing) => ing.name === editingIngredient.name
        );
        setSelectedIngredient(updatedSelected || null);
      }

      // Clear editing state
      setEditingIngredient(null);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="app-container">
      <div className="inventory-header">
        <h1>Bakery Inventory</h1>
        <Link to="/dashboard" className="dashboard-button">
          Go to Dashboard
        </Link>
      </div>

      <form onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Unit (e.g. kg, g, L)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          required
        />
        <input
          type="number"
          value={lowStock}
          onChange={(e) => setLowStock(Number(e.target.value))}
          placeholder="Low stock threshold"
          required
        />
        <button type="submit">Add Ingredient</button>
      </form>

      <div className="filter-buttons">
        <button onClick={handleShowLowStock} disabled={showingLowStock}>
          Show Low Stock
        </button>
        <button onClick={handleShowAll} disabled={!showingLowStock}>
          Show All
        </button>
      </div>

      <ul>
        {displayedIngredients.map((item, index) => (
          <>
            <li
              key={index}
              onClick={() => setSelectedIngredient(selectedIngredient?.name === item.name ? null : item)}
              className={selectedIngredient && selectedIngredient.name === item.name ? 'selected' : ''}
            >
              <div className="ingredient-row">
                <span className="ingredient-info">
                  {item.name} - {item.quantity} {item.unit}
                </span>
                <span className="ingredient-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIngredient({ 
                        ...item, 
                        originalName: item.name,
                        quantity: String(item.quantity),
                        low_stock_threshold: String(item.low_stock_threshold)
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const nameForUrl = encodeURIComponent(item.name.toLowerCase());
                      const response = await fetch(
                        `http://localhost:5000/ingredients/${nameForUrl}`,
                        {
                          method: 'DELETE',
                        }
                      );
                      if (response.ok) {
                        setIngredients(
                          ingredients.filter(
                            (ing) => ing.name !== item.name
                          )
                        );
                        if (selectedIngredient && selectedIngredient.name === item.name) {
                          setSelectedIngredient(null);
                        }
                        if (editingIngredient && editingIngredient.originalName === item.name) {
                          setEditingIngredient(null);
                        }
                      } else {
                        alert('Failed to delete ingredient.');
                      }
                    }}
                  >
                    Delete
                  </button>
                </span>
              </div>
            </li>
            {selectedIngredient && selectedIngredient.name === item.name && (
              <li className="details-card" style={{ boxShadow: 'none', marginTop: '-8px', marginBottom: '18px' }}>
                <h2>Selected Ingredient Details</h2>
                <p><strong>Name:</strong> {selectedIngredient.name}</p>
                <p><strong>Quantity:</strong> {selectedIngredient.quantity}</p>
                <p><strong>Unit:</strong> {selectedIngredient.unit}</p>
                <p><strong>Low Stock Threshold:</strong> {selectedIngredient.low_stock_threshold}</p>
              </li>
            )}
            {editingIngredient && editingIngredient.originalName === item.name && (
              <li className="edit-card" style={{ boxShadow: 'none', marginTop: '-8px', marginBottom: '18px' }}>
                <h2>Edit Ingredient</h2>
                <form onSubmit={handleUpdate}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={editingIngredient.name}
                    onChange={(e) =>
                      setEditingIngredient({ ...editingIngredient, name: e.target.value })
                    }
                    required
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={editingIngredient.quantity}
                    onChange={(e) =>
                      setEditingIngredient({ ...editingIngredient, quantity: e.target.value })
                    }
                    required
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={editingIngredient.unit}
                    onChange={(e) =>
                      setEditingIngredient({ ...editingIngredient, unit: e.target.value })
                    }
                    required
                  />
                  <input
                    type="number"
                    placeholder="Low stock threshold"
                    value={editingIngredient.low_stock_threshold}
                    onChange={(e) =>
                      setEditingIngredient({ ...editingIngredient, low_stock_threshold: e.target.value })
                    }
                    required
                  />
                  <button type="submit">Update</button>
                  <button type="button" onClick={() => setEditingIngredient(null)}>Cancel</button>
                </form>
              </li>
            )}
          </>
        ))}
      </ul>

      <BakeItem onBakeSuccess={() => {
        fetch("http://localhost:5000/ingredients")
          .then((res) => res.json())
          .then((data) => {
            setIngredients(data);
            if (!showingLowStock) {
              setDisplayedIngredients(data);
            } else {
              setDisplayedIngredients(
                data.filter(
                  (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
                )
              );
            }
          });
      }} className="bake-card" refreshRecipes={refreshRecipes} />

      {/* Recipe Creation Section */}
      <div className="recipe-section">
        <h2>Create New Recipe</h2>
        <RecipeForm onRecipeSaved={() => setRefreshRecipes(r => r + 1)} />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
