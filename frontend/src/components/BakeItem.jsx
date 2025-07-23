import { useState, useEffect } from 'react';

function BakeItem({ onBakeSuccess, className, refreshRecipes }) {
  const [recipes, setRecipes] = useState({});
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch available recipes
    fetch('http://localhost:5000/recipes')
      .then(res => res.json())
      .then(data => setRecipes(data))
      .catch(err => console.error('Error fetching recipes:', err));
  }, [refreshRecipes]);

  const handleBake = async () => {
    if (!selectedRecipe) {
      setMessage('Please select a recipe to bake');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/bake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item: selectedRecipe }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Success! ${selectedRecipe} has been baked successfully!`);
        setSelectedRecipe('');
        if (onBakeSuccess) {
          onBakeSuccess();
        }
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Error: Failed to bake item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <h2>Bake an Item</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="recipe-select" style={{ marginRight: '10px' }}>
          Select Recipe:
        </label>
        <select
          id="recipe-select"
          value={selectedRecipe}
          onChange={(e) => setSelectedRecipe(e.target.value)}
        >
          <option value="">Choose a recipe...</option>
          {Object.keys(recipes).map(recipe => (
            <option key={recipe} value={recipe}>
              {recipe}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleBake}
          disabled={!selectedRecipe || isLoading}
        >
          {isLoading ? 'Baking...' : 'Bake'}
        </button>
      </div>

      {message && (
        <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
          {message}
        </div>
      )}

      {selectedRecipe && recipes[selectedRecipe] && (
        <div style={{ marginTop: '15px' }}>
          <h3>Recipe for {selectedRecipe}:</h3>
          <ul>
            {Object.entries(recipes[selectedRecipe]).map(([ingredient, details]) => (
              <li key={ingredient}>
                {ingredient}: {details.amount} {details.unit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BakeItem; 