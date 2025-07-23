from flask import Flask, request, jsonify
from datetime import datetime
import json
import os

app = Flask(__name__)
from flask_cors import CORS
CORS(app)

HISTORY_FILE = 'history.json'

# Predefined recipes (with units)
RECIPES_FILE = 'recipes.json'

def load_recipes():
    if os.path.exists(RECIPES_FILE):
        with open(RECIPES_FILE, 'r') as file:
            return json.load(file)
    return {}

def save_recipes():
    with open(RECIPES_FILE, 'w') as file:
        json.dump(RECIPES, file, indent=2)

RECIPES = load_recipes()

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    return []

def save_history(history):
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=4)

# Temporary in-memory "database"
ingredients = []

DATA_FILE = 'data.json'

def load_ingredients():
    global ingredients
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            ingredients.clear()
            ingredients.extend(json.load(f))

def save_ingredients():
    with open(DATA_FILE, 'w') as f:
        json.dump(ingredients, f, indent=4)

@app.route('/')
def index():
    return 'Backend is running!'

# Route to get available recipes
@app.route('/recipes', methods=['GET'])
def get_recipes():
    return jsonify(RECIPES)

# Route to bake an item
@app.route('/bake', methods=['POST'])
def bake_item():
    data = request.get_json()
    item_name = data.get('item')
    
    if not item_name or item_name not in RECIPES:
        return jsonify({"error": f"Recipe '{item_name}' not found"}), 404
    
    recipe = RECIPES[item_name]
    missing_ingredients = []
    insufficient_ingredients = []
    
    # Check if all required ingredients are available in sufficient quantity
    for ingredient_name, recipe_details in recipe.items():
        found_ingredient = None
        for ingredient in ingredients:
            if ingredient["name"].lower() == ingredient_name.lower():
                found_ingredient = ingredient
                break
        
        if not found_ingredient:
            missing_ingredients.append(ingredient_name)
        else:
            # Convert quantities to numbers for comparison
            available_qty = float(found_ingredient["quantity"])
            needed_qty = float(recipe_details["amount"])
            
            # Verify units match
            if found_ingredient["unit"].lower() != recipe_details["unit"].lower():
                return jsonify({
                    "error": f"Unit mismatch for {ingredient_name}: recipe needs {needed_qty} {recipe_details['unit']}, but inventory has {available_qty} {found_ingredient['unit']}"
                }), 400

            if available_qty < needed_qty:
                insufficient_ingredients.append({
                    "name": ingredient_name,
                    "available": f"{available_qty} {found_ingredient['unit']}",
                    "needed": f"{needed_qty} {recipe_details['unit']}"
                })
    
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
    
    save_ingredients()
    
    # Log the baking event
    history = load_history()
    event = {
        "item": item_name,
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    }
    history.append(event)
    save_history(history)
    
    return jsonify({
        "message": f"{item_name} baked successfully!",
        "updated_ingredients": ingredients
    }), 200

# Route to add a new ingredient
@app.route('/ingredients', methods=['POST'])
def add_ingredient():
    data = request.get_json()

    # Check if ingredient already exists
    for item in ingredients:
        if item["name"].lower() == data["name"].lower():
            return jsonify({"error": f"{data['name']} already exists!"}), 400
        
    ingredient = {
        "name": data["name"],
        "unit": data["unit"],
        "quantity": data["quantity"],
        "low_stock_threshold": data["low_stock_threshold"]
    }
    ingredients.append(ingredient)
    save_ingredients()
    return jsonify({"message": "Ingredient added!", "ingredient": ingredient})

# Route to view all ingredients
@app.route('/ingredients', methods=['GET'])
def get_ingredients():
    return jsonify(ingredients)

@app.route('/ingredients/<name>', methods=['DELETE'])
def delete_ingredient(name):    
    global ingredients
    print(f"Trying to delete: {name}")
    print(f"Current ingredients: {ingredients}")
    for i, item in enumerate(ingredients):
        if item['name'].lower() == name.lower():
            del ingredients[i]
            save_ingredients()
            return jsonify({'message': f'{name} deleted'}), 200
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
            item["unit"] = data.get("unit", item["unit"])
            item["quantity"] = data.get("quantity", item["quantity"])
            item["low_stock_threshold"] = data.get("low_stock_threshold", item["low_stock_threshold"])
            save_ingredients()
            return jsonify({"message": f"{name} updated!", "ingredient": item}), 200
    return jsonify({"error": f"{name} not found"}), 404

# Route to get all low-stock ingredients
@app.route('/ingredients/low-stock', methods=['GET'])
def get_low_stock_ingredients():
    low_stock_items = [
        item for item in ingredients
        if item["quantity"] < item["low_stock_threshold"]
    ]
    return jsonify(low_stock_items), 200

@app.route('/history', methods=['GET'])
def get_baking_history():
    history = load_history()
    return jsonify(history)

@app.route('/history', methods=['POST'])
def add_baking_history():
    data = request.get_json()

    # Optional: Validate required fields
    if "item" not in data or "quantity" not in data or "ingredients_used" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    history = load_history()
    event = {
        "item": data["item"],
        "quantity": data["quantity"],
        "ingredients_used": data["ingredients_used"],  # List of dicts
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    history.append(event)
    save_history(history)

    return jsonify({"message": "Baking history recorded", "event": event}), 201

@app.route('/ingredients/<name>/subtract', methods=['POST'])
def subtract_ingredient(name):
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

@app.route('/add-recipe', methods=['POST'])
def add_recipe():
    data = request.get_json()
    recipe_name = data.get('recipe_name')
    ingredients = data.get('ingredients')

    if not recipe_name or not ingredients:
        return jsonify({"error": "Missing recipe name or ingredients"}), 400

    if recipe_name in RECIPES:
        return jsonify({"error": "Recipe already exists"}), 400

    RECIPES[recipe_name] = ingredients
    save_recipes()
    return jsonify({"message": f"Recipe '{recipe_name}' added successfully"}), 200


if __name__ == '__main__':
    load_ingredients()
    app.run(debug=True)
