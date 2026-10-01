import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCustomer } from '../../context/CustomerContext.jsx';
import { api } from '../../api/client.js';

export default function Resources() {
  const { token } = useAuth();
  const { showToast } = useCustomer();
  const [resources, setResources] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const categories = ['All', 'Whitepaper', 'Comparison Guide', 'Technical Document', 'Case Study', 'Product Guide', 'Product Brochure'];

  useEffect(() => {
    async function loadResources() {
      setLoading(true);
      try {
        const query = selectedCategory !== 'All' ? `?category=${encodeURIComponent(selectedCategory)}` : '';
        const data = await api(`/customer/resources${query}`, { token });
        setResources(data.resources || []);
      } catch (err) {
        console.error('Error fetching resources:', err);
        showToast('Failed to load technical resources', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, [token, selectedCategory, showToast]);

  const handleResourceClick = async (resource) => {
    try {
      if (token) {
        await api('/customer/events', {
          method: 'POST',
          token,
          body: {
            eventType: 'CONTENT_VIEW',
            description: `Viewed document abstract for "${resource.title}"`,
            metadata: { resourceId: resource.id, title: resource.title, category: resource.category },
          },
        });
      }
    } catch (err) {
      console.warn('Error recording content view event:', err);
    }
  };

  const handleDownload = async (resource) => {
    setDownloadingId(resource.id);
    try {
      const result = await api(`/customer/resources/${resource.id}/download`, {
        method: 'POST',
        token,
      });

      showToast(`Downloaded: ${resource.title} (+8 CRM Lead Points)`, 'success');

      // Update local download count
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, downloadsCount: (r.downloadsCount || 0) + 1 } : r))
      );

      // Trigger simulated file download in browser
      const blob = new Blob([
        `Lead-to-Deal Enterprise Document Library\n\nTitle: ${resource.title}\nCategory: ${resource.category}\nPublished Date: ${resource.publishedDate}\nDescription: ${resource.description}\n\nThis is a verified simulated enterprise technical document from the Autonomous Lead-to-Deal CRM Customer Portal.\n`
      ], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resource.id}-${resource.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message || 'Error downloading resource', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="resources-page">
      <div className="resources-header">
        <span className="section-kicker">Knowledge Base & Whitepapers</span>
        <h1 className="page-title">Technical Resources & Buyer's Guides</h1>
        <p className="page-subtitle">
          Download in-depth hardware benchmarks, security whitepapers, MDM integration blueprints, and customer case studies.
        </p>

        {/* Category Filter Pills */}
        <div className="category-pills-row">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cat-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="customer-loading-state">
          <div className="spinner"></div>
          <p>Loading technical library...</p>
        </div>
      ) : resources.length > 0 ? (
        <div className="resources-grid">
          {resources.map((res) => (
            <div
              key={res.id}
              className="resource-card"
              onClick={() => handleResourceClick(res)}
            >
              <div className="resource-card-top">
                <span className="res-category-tag">{res.category}</span>
                <span className="res-file-format">{res.fileType} • {res.fileSize}</span>
              </div>

              <h3 className="resource-title">{res.title}</h3>
              <p className="resource-desc">{res.description}</p>

              <div className="resource-card-footer">
                <div className="res-meta-info">
                  <span>📅 {res.publishedDate}</span>
                  <span>•</span>
                  <span>📥 {res.downloadsCount?.toLocaleString() || 0} downloads</span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-download-res"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(res);
                  }}
                  disabled={downloadingId === res.id}
                >
                  {downloadingId === res.id ? 'Downloading...' : '⬇ Download PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-cart-wishlist-box">
          <p>No resources found in this category.</p>
          <button className="btn btn-outline" onClick={() => setSelectedCategory('All')}>
            Show All Resources
          </button>
        </div>
      )}
    </div>
  );
}
