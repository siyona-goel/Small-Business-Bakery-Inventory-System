import { useNavigate } from 'react-router-dom';
import homePageImage from '../assets/home_page_image.png';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const handleGoToInventory = () => {
    navigate('/inventory');
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <button 
          className="inventory-button"
          onClick={handleGoToInventory}
        >
          Go to my Inventory
        </button>
      </div>
    </div>
  );
}

export default LandingPage; 