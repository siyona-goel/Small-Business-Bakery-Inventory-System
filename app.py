# Import Flask
from flask import Flask, request, jsonify
# Import the datetime module to work with dates and times
from datetime import datetime
# Import json module to read/write JSON files and handle JSON data
import json
# Import os module to interact with the operating system (check if files exist, etc.)
import os

# Initialize the Flask app
app = Flask(__name__)

# Enable CORS so frontend apps (like React) can access this backend
from flask_cors import CORS
CORS(app)

# File paths for storing persistent data
HISTORY_FILE = 'history.json' # Stores baking history records
RECIPES_FILE = 'recipes.json' # Predefined recipes (with units)
DATA_FILE = 'data.json'       # Stores ingredient inventory data

# ---------- Helper Functions for Recipes ----------

def load_recipes():
    # Load saved recipes from the recipes file
    # Check if the recipes file exists on the computer
    if os.path.exists(RECIPES_FILE):
        # Open the file in read mode
        with open(RECIPES_FILE, 'r') as file:
            # Load the JSON data from file and convert it to Python dictionary
            return json.load(file)
    # If the file doesn't exist, return empty dictionary
    return {}

def save_recipes():
    # Save the current RECIPES dict to file
    # Open the recipes file in write mode
    with open(RECIPES_FILE, 'w') as file:
        # Convert the RECIPES dictionary to JSON format and write to file
        # indent=2 makes the JSON file human-readable with proper formatting
        json.dump(RECIPES, file, indent=2)

# Load the recipes at startup
# Populate the RECIPES dictionary with saved data
RECIPES = load_recipes()

# ---------- Helper Functions for Baking History ----------

def load_history():
    # Load historical bake records from file
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r') as f:
            # Load the JSON data and return it as a Python list
            return json.load(f)
    # If file doesn't exist, return an empty list
    return []

def save_history(history):
    # Save the baking history back to file
    with open(HISTORY_FILE, 'w') as f:
        # Convert the history list to JSON and write to file
        # indent=4 makes the JSON file nicely formatted and readable
        json.dump(history, f, indent=4)

# ---------- Ingredient Inventory Logic ----------

# Create an empty list to store ingredients in memory during runtime
# This list will hold dictionaries, each representing one ingredient
ingredients = []

def load_ingredients():
    # Load saved ingredient list into memory
    global ingredients
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            # Clear any existing ingredients from memory
            ingredients.clear()
            # Load ingredients from file and add them to the ingredients list
            # extend() adds all items from the loaded list to our ingredients list
            ingredients.extend(json.load(f))

def save_ingredients():
    """
    Function to save current ingredient state from memory to file
    This ensures ingredient data persists when the server restarts
    """
    with open(DATA_FILE, 'w') as f:
        json.dump(ingredients, f, indent=4)

# ---------- Routes ----------

@app.route('/')
def index():
    # Return a simple string message to confirm the server is running
    return 'Backend is running!'

# Route to get available recipes
# methods=['GET'] means this endpoint only responds to GET requests (for retrieving data)
@app.route('/recipes', methods=['GET'])
def get_recipes():
    """
    API endpoint to return all stored recipes in JSON format
    Frontend applications can call this to get the list of available recipes
    """
    # jsonify() converts Python dictionary to JSON format for web response
    return jsonify(RECIPES)

# Route to bake an item
# This endpoint accepts POST requests (for sending data)
@app.route('/bake', methods=['POST'])
def bake_item():
    # Endpoint to process a baking request based on available ingredients
    data = request.get_json()
    item_name = data.get('item')
    # Check if the item name was provided and if the recipe exists in the RECIPES dictionary
    if not item_name or item_name not in RECIPES:
        # Return error response with 404 status code
        return jsonify({"error": f"Recipe '{item_name}' not found"}), 404
    
    # Get the recipe details
    recipe = RECIPES[item_name]
    # Create empty lists to track any problems with ingredients
    missing_ingredients = []        # Ingredients that aren't there
    insufficient_ingredients = []   # Ingredients I don't have enough of 
    
    # Check if all required ingredients are available in sufficient quantity
    for ingredient_name, recipe_details in recipe.items():
        found_ingredient = None
        # Search through ingredient inventory
        for ingredient in ingredients:
            if ingredient["name"].lower() == ingredient_name.lower():
                found_ingredient = ingredient
                # Break out of loop since I found what I was looking for
                break
        
        # If I didn't find the ingredient in the inventory
        if not found_ingredient:
            # Add it to the list of missing ingredients
            missing_ingredients.append(ingredient_name)
        else:
            # We found the ingredient, now check if we have enough quantity
            # Convert string quantities to numbers for mathematical comparison
            available_qty = float(found_ingredient["quantity"])
            needed_qty = float(recipe_details["amount"])
            
            # Verify units match
            if found_ingredient["unit"].lower() != recipe_details["unit"].lower():
                return jsonify({
                    "error": f"Unit mismatch for {ingredient_name}: recipe needs {needed_qty} {recipe_details['unit']}, but inventory has {available_qty} {found_ingredient['unit']}"
                }), 400

            # Check if the ingredient is available in sufficient quantity
            if available_qty < needed_qty:
                # I don't have enough - add details to insufficient ingredients list
                insufficient_ingredients.append({
                    "name": ingredient_name,
                    "available": f"{available_qty} {found_ingredient['unit']}",
                    "needed": f"{needed_qty} {recipe_details['unit']}"
                })
    
    # Respond to missing or insufficient items
    if missing_ingredients:
        return jsonify({
            "error": f"Missing ingredients: {', '.join(missing_ingredients)}"
        }), 400
    
    if insufficient_ingredients:
        error_msg = "Insufficient ingredients: "
        for item in insufficient_ingredients:
            error_msg += f"{item['name']} (available: {item['available']}, needed: {item['needed']}), "
        return jsonify({"error": error_msg.rstrip(', ')}), 400
    
    # All checks passed, subtract the quantities
    for ingredient_name, recipe_details in recipe.items():
        for ingredient in ingredients:
            if ingredient["name"].lower() == ingredient_name.lower():
                current_qty = float(ingredient["quantity"])
                ingredient["quantity"] = current_qty - float(recipe_details["amount"])
                break
    # Save the updated ingredient quantities to file
    save_ingredients()
    
    # Log the baking event to history
    history = load_history()
    # Create a new event record
    event = {
        "item": item_name,
        # Get current date and time in ISO format (YYYY-MM-DDTHH:MM:SS)
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    }
    # Add the new event to history list
    history.append(event)
    # Save updated history back to file
    save_history(history)
    
    return jsonify({
        "message": f"{item_name} baked successfully!",
        "updated_ingredients": ingredients
    }), 200 #200 sttus code means success

# Route to add a new ingredient
@app.route('/ingredients', methods=['POST'])
def add_ingredient():
    # Add a new ingredient to inventory
    # Get the JSON data sent in the request
    data = request.get_json()

    # Check if ingredient already exists
    for item in ingredients:
        if item["name"].lower() == data["name"].lower():
            return jsonify({"error": f"{data['name']} already exists!"}), 400
        
    # Create a new ingredient dictionary with the provided data
    ingredient = {
        "name": data["name"],
        "unit": data["unit"],
        "quantity": data["quantity"],
        "low_stock_threshold": data["low_stock_threshold"]
    }
    # Add new ingredient to the ingredients list
    ingredients.append(ingredient)
    # Save the updated ingredients list to file
    save_ingredients()
    # Return success message with ingredient that was added
    return jsonify({"message": "Ingredient added!", "ingredient": ingredient})

# Route to view all ingredients
@app.route('/ingredients', methods=['GET'])
def get_ingredients():
    # Convert ingredients list to JSON and return it
    return jsonify(ingredients)

# Route to delete a specific ingredient by name
# <name> is a URL parameter that gets passed to the function
@app.route('/ingredients/<name>', methods=['DELETE'])
def delete_ingredient(name): 
    """
    API endpoint to delete an ingredient from inventory by name
    
    Parameters:
    name (str): Name of ingredient to delete (from URL)
    """

    global ingredients
    print(f"Trying to delete: {name}")
    print(f"Current ingredients: {ingredients}")
    # Loop through ingredients with enumerate to get both index and item
    # enumerate gives (index, item) pairs
    for i, item in enumerate(ingredients):
        if item['name'].lower() == name.lower():
            # Delete the ingredient at index i
            del ingredients[i]
            save_ingredients()
            return jsonify({'message': f'{name} deleted'}), 200
    # If I reach here, I didn't find the ingredient
    return jsonify({'error': f'{name} not found'}), 404

# Route to get a single ingredient by name
@app.route('/ingredients/<name>', methods=['GET'])
def get_ingredient(name):
    for item in ingredients:
        if item["name"].lower() == name.lower():
            return jsonify(item), 200
    return jsonify({"error": f"{name} not found"}), 404

# Route to update an ingredient by name
@app.route('/ingredients/<name>', methods=['PUT'])
def update_ingredient(name):
    data = request.get_json()
    for item in ingredients:
        if item["name"].lower() == name.lower():
            # Update only the fields provided in the request
            # data.get() returns the value if it exists, otherwise returns the current value
            item["unit"] = data.get("unit", item["unit"])
            item["quantity"] = data.get("quantity", item["quantity"])
            item["low_stock_threshold"] = data.get("low_stock_threshold", item["low_stock_threshold"])
            save_ingredients()
            return jsonify({"message": f"{name} updated!", "ingredient": item}), 200
    
    # If ingredient not found, return error
    return jsonify({"error": f"{name} not found"}), 404

# Route to get all ingredients that are running low on stock
@app.route('/ingredients/low-stock', methods=['GET'])
def get_low_stock_ingredients():
    """
    API endpoint to get all ingredients where quantity is below the low stock threshold
    Useful for knowing what needs to be restocked
    """
    # Use list comprehension to filter ingredients
    # This creates a new list containing only items where quantity < threshold
    low_stock_items = [
        item for item in ingredients
        if item["quantity"] < item["low_stock_threshold"]
    ]
    # Return the filtered list as JSON
    return jsonify(low_stock_items), 200

# Route to get baking history records 
@app.route('/history', methods=['GET'])
def get_baking_history():
    history = load_history()
    return jsonify(history)

# Route to manually add a baking history record 
@app.route('/history', methods=['POST'])
def add_baking_history():
    # Get the data from request body
    data = request.get_json()

    # Validate that required fields are present
    if "item" not in data or "quantity" not in data or "ingredients_used" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    # Load existing history
    history = load_history()
    # Create a new event record 
    event = {
        "item": data["item"],
        "quantity": data["quantity"],
        "ingredients_used": data["ingredients_used"],  # List of ingredients used
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    history.append(event)
    save_history(history)

    return jsonify({"message": "Baking history recorded", "event": event}), 201

@app.route('/ingredients/<name>/subtract', methods=['POST'])
def subtract_ingredient(name):
    # Manually subtract from an ingredient
    data = request.get_json()
    amount = data.get("amount", 0)

    for item in ingredients:
        if item["name"].lower() == name.lower():
            if amount < 0:
                return jsonify({"error": "Amount must be positive"}), 400
            if amount > item["quantity"]:
                return jsonify({"error": "Not enough quantity to subtract"}), 400

            item["quantity"] -= amount
            save_ingredients()
            return jsonify({
                "message": f"Subtracted {amount} from {name}",
                "ingredient": item
            }), 200

    return jsonify({"error": f"{name} not found"}), 404

# Route to add a new recipe to the recipe collection
@app.route('/add-recipe', methods=['POST'])
def add_recipe():
    # Add a new recipe to the collection
    data = request.get_json()
    recipe_name = data.get('recipe_name')
    ingredients = data.get('ingredients')

    # Validate that both recipe name and ingredients were provided
    if not recipe_name or not ingredients:
        return jsonify({"error": "Missing recipe name or ingredients"}), 400
    # Check if recipe already exists
    if recipe_name in RECIPES:
        return jsonify({"error": "Recipe already exists"}), 400

    # Add the new recipe to the RECIPES dictionary
    RECIPES[recipe_name] = ingredients
    save_recipes()
    return jsonify({"message": f"Recipe '{recipe_name}' added successfully"}), 200

# ---------- Start the App ----------
# This block only runs if this file is executed directly (not imported as a module)
if __name__ == '__main__':
    # Load ingredients at startup
    load_ingredients()
    # Start the Flask server
    app.run(debug=True)
