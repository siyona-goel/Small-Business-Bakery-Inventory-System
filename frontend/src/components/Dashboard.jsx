import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [ingredients, setIngredients] = useState([]);
  const [history, setHistory] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalIngredients: 0,
    lowStockItems: 0,
    itemsBakedToday: 0,
    lastBakedItem: null
  });

  useEffect(() => {
    // Fetch ingredients
    fetch('http://localhost:5000/ingredients')
      .then(res => res.json())
      .then(data => {
        setIngredients(data);
        const lowStockCount = data.filter(
          item => Number(item.quantity) <= Number(item.low_stock_threshold)
        ).length;
        setSummaryData(prev => ({ ...prev, totalIngredients: data.length, lowStockItems: lowStockCount }));
      });

    // Fetch baking history
    fetch('http://localhost:5000/history')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        
        // Calculate today's baking count
        const today = new Date().toISOString().split('T')[0];
        const todayCount = data.filter(item => 
          item.timestamp.startsWith(today)
        ).length;

        // Get last baked item
        const lastBaked = data.length > 0 ? data[data.length - 1] : null;

        setSummaryData(prev => ({
          ...prev,
          itemsBakedToday: todayCount,
          lastBakedItem: lastBaked
        }));
      });
  }, []);

  // Get product counts for the last 7 days
  const getProductTrendsData = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // includes today
    const productCounts = {};
    history.forEach(item => {
      const bakedDate = new Date(item.timestamp);
      if (bakedDate >= sevenDaysAgo) {
        productCounts[item.item] = (productCounts[item.item] || 0) + 1;
      }
    });
    return productCounts;
  };

  // For chart rendering, keep the same layout but use productTrends
  const productTrends = getProductTrendsData();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Bakery Dashboard</h1>
        <Link to="/" className="inventory-button">
          Go to Inventory
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Ingredients</h3>
          <p className="number">{summaryData.totalIngredients}</p>
        </div>
        <div className="summary-card">
          <h3>Low Stock Items</h3>
          <p className="number warning">{summaryData.lowStockItems}</p>
        </div>
        <div className="summary-card">
          <h3>Items Baked Today</h3>
          <p className="number">{summaryData.itemsBakedToday}</p>
        </div>
        <div className="summary-card">
          <h3>Last Baked Item</h3>
          <p className="last-baked">
            {summaryData.lastBakedItem ? (
              <>
                <span>{summaryData.lastBakedItem.item}</span>
                <small>{new Date(summaryData.lastBakedItem.timestamp).toLocaleString()}</small>
              </>
            ) : (
              'No items baked yet'
            )}
          </p>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Low Stock Alerts */}
        <div className="dashboard-section low-stock-section">
          <h2>Low Stock Alerts</h2>
          <div className="low-stock-list">
            {ingredients
              .filter(item => Number(item.quantity) <= Number(item.low_stock_threshold))
              .map((item, index) => (
                <div key={index} className="low-stock-item">
                  <span className="name">{item.name}</span>
                  <span className="quantity">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="threshold">
                    Threshold: {item.low_stock_threshold} {item.unit}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Baking Trends Chart */}
        <div className="dashboard-section trends-section">
          <h2>Baking Trends (Last 7 Days)</h2>
          <div className="chart">
            {Object.keys(productTrends).length === 0 ? (
              <div style={{ color: '#a86b1c', fontStyle: 'italic' }}>No baking activity in the last 7 days.</div>
            ) : (
              Object.entries(productTrends).map(([product, count], index) => (
                <div key={index} className="bar-container">
                  <div 
                    className="bar" 
                    style={{ height: `${count * 30}px` }}
                    title={`${count} baked`}
                  >
                    {count > 0 && <span className="bar-value">{count}</span>}
                  </div>
                  <span className="bar-label" style={{ fontSize: '0.95rem', fontWeight: 500 }}>{product}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="dashboard-section activity-section">
          <h2>Recent Baking Activity</h2>
          <table className="activity-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Time Baked</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(-5).reverse().map((item, index) => (
                <tr key={index}>
                  <td>{item.item}</td>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 