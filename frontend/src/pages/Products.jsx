import { useState, useEffect } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct as deleteProductApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function Products() {
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProductObj, setEditProductObj] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    category: "Furniture",
    type: "Goods",
    salesPrice: "",
    purchasePrice: "",
    stock: "",
    status: "Active",
  });

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProducts();
      const mapped = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        code: p.sku || "",
        category: p.category || "Furniture",
        type: p.unit === "Service" ? "Service" : "Goods",
        salesPrice: Number(p.sale_price || 0),
        purchasePrice: Number(p.purchase_price || 0),
        stock: 0,
        status: p.is_active ? "Active" : "Inactive",
      }));
      setProducts(mapped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.code} ${product.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditProductObj(null);
    setForm({
      name: "",
      code: "",
      category: "Furniture",
      type: "Goods",
      salesPrice: "",
      purchasePrice: "",
      stock: "",
      status: "Active",
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditProductObj(product);
    setForm({
      name: product.name,
      code: product.code,
      category: product.category,
      type: product.type,
      salesPrice: product.salesPrice,
      purchasePrice: product.purchasePrice,
      stock: product.stock,
      status: product.status,
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const saveProduct = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.code.trim()) {
      alert("Please enter Product Name and Product Code");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.code.trim(),
        category: form.category,
        unit: form.type === "Service" ? "Service" : "Unit",
        sale_price: form.salesPrice ? Number(form.salesPrice) : 0,
        purchase_price: form.purchasePrice ? Number(form.purchasePrice) : 0,
        is_active: form.status === "Active",
      };

      if (!editProductObj) {
        await createProduct(payload);
      } else {
        await updateProduct(editProductObj.id, payload);
      }

      setShowModal(false);
      await loadProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    try {
      await deleteProductApi(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="product-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <p className="breadcrumb">Home / Products</p>
          <h1>Products</h1>
          <p className="subtitle">Manage your products and inventory</p>
        </div>

        <button className="primary-btn" onClick={openAddModal}>
          + New Product
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: "16px" }}>{error}</Alert>}

      {/* TOOLBAR */}
      <div className="product-toolbar">
        <input
          type="text"
          placeholder="Search product, code or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="product-view-buttons">
          <button
            className={view === "list" ? "view-active" : ""}
            onClick={() => setView("list")}
          >
            ☷ List
          </button>

          <button
            className={view === "kanban" ? "view-active" : ""}
            onClick={() => setView("kanban")}
          >
            ▦ Kanban
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="table-card">
          <div className="table-top">
            <div>
              <strong>Product List</strong>
            </div>

            <span className="count-badge">
              {filteredProducts.length} Products
            </span>
          </div>

          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Sales Price</th>
                  <th>Purchase Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="empty-state">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-icon">📦</div>
                          <div>
                            <b>{product.name}</b>
                            <small>Product</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="product-code">{product.code}</span>
                      </td>

                      <td>{product.category}</td>

                      <td>
                        <span className="product-type">{product.type}</span>
                      </td>

                      <td>
                        ₹{product.salesPrice.toLocaleString("en-IN")}
                      </td>

                      <td>
                        ₹{product.purchasePrice.toLocaleString("en-IN")}
                      </td>

                      <td>{product.stock}</td>

                      <td>
                        <span
                          className={
                            product.status === "Active"
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          {product.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="small-btn"
                          onClick={() => openEditModal(product)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => deleteProduct(product.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="empty-state">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="product-kanban">
          {loading ? (
            <div className="empty-card" style={{ gridColumn: "1/-1" }}>
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.map((product) => (
            <div className="product-card" key={product.id}>
              <div className="product-card-top">
                <span
                  className={
                    product.status === "Active"
                      ? "status-active"
                      : "status-inactive"
                  }
                >
                  {product.status}
                </span>

                <div className="product-card-icon">📦</div>
              </div>

              <h3>{product.name}</h3>

              <p className="product-card-code">{product.code}</p>

              <div className="product-info">
                <div>
                  <span>Category</span>
                  <strong>{product.category}</strong>
                </div>

                <div>
                  <span>Type</span>
                  <strong>{product.type}</strong>
                </div>

                <div>
                  <span>Sales Price</span>
                  <strong>
                    ₹{product.salesPrice.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div>
                  <span>Stock</span>
                  <strong>{product.stock}</strong>
                </div>
              </div>

              <div className="product-card-actions">
                <button
                  className="small-btn"
                  onClick={() => openEditModal(product)}
                >
                  Edit
                </button>

                <button
                  className="delete-btn"
                  onClick={() => deleteProduct(product.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY */}
      {!loading && filteredProducts.length === 0 && (
        <div className="empty-card">
          <div className="empty-icon">📦</div>
          <h2>No Products Found</h2>
          <p>Try another search or create a new product.</p>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="product-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {!editProductObj ? "Create Product" : "Edit Product"}
                </h2>
                <p>Enter product information</p>
              </div>

              <button
                className="close-modal"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <div className="form-section">
                <h3>Basic Information</h3>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Product Code *</label>
                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="PRD-001"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      <option>Furniture</option>
                      <option>Lighting</option>
                      <option>Electronics</option>
                      <option>Hardware</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Product Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <option>Goods</option>
                      <option>Service</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Pricing & Inventory</h3>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Sales Price</label>
                    <input
                      type="number"
                      name="salesPrice"
                      value={form.salesPrice}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Purchase Price</label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={form.purchasePrice}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : !editProductObj
                    ? "Save Product"
                    : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;