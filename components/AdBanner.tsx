import React from 'react';

interface AdBannerProps {
  type: 'wide' | 'square';
}

const AdBanner: React.FC<AdBannerProps> = ({ type }) => {
  return (
    <div className={`ad-banner ${type === 'wide' ? 'wide' : 'square'} stamp-style`}>
      <div className="ad-content">
        <div className="ad-icon">
          <i className="fas fa-star"></i>
        </div>
        <div className="ad-text">
          <span className="ad-title">✨ 地雷系広告 ✨</span>
          <span className="ad-subtitle">可愛い広告スペース</span>
        </div>
        <div className="ad-decoration">
          <div className="sparkle">✨</div>
          <div className="sparkle">💖</div>
          <div className="sparkle">🌸</div>
        </div>
      </div>
    </div>
  );
};

export default AdBanner; 