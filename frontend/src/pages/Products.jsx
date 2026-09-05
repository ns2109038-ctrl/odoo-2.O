import { useState, useEffect, useRef } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct as deleteProductApi } from "../lib/api.js";
import Alert from "../components/ui/Alert.jsx";

function Products() {
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProductObj, setEditProductObj] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Category creation
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    category: "Furniture",
    type: "Goods",
    salesPrice: "",
    costPrice: "",
    stock: "",
    status: "Active",
    image_url: "",
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
        type: p.type || (p.unit === "Service" ? "Service" : "Goods"),
        salesPrice: Number(p.sale_price || 0),
        costPrice: Number(p.purchase_price || 0),
        stock: 0,
        status: p.is_active ? "Active" : "Inactive",
        image_url: p.image_url || "",
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

  const categories = Array.from(
    new Set([
      "Furniture",
      "Lighting",
      "Electronics",
      "Hardware",
      "Office",
      "Decor",
      ...products.map((p) => p.category).filter(Boolean),
    ])
  );

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.code} ${product.category} ${product.type}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const generateSku = () => {
    return "PRD-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const openAddModal = () => {
    setEditProductObj(null);
    setForm({
      name: "",
      code: generateSku(),
      category: "Furniture",
      type: "Goods",
      salesPrice: "",
      costPrice: "",
      stock: "",
      status: "Active",
      image_url: "",
    });
    setIsNewCategory(false);
    setNewCategoryName("");
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditProductObj(product);
    setForm({
      name: product.name,
      code: product.code,
      category: product.category,
      type: product.type || "Goods",
      salesPrice: product.salesPrice,
      costPrice: product.costPrice,
      stock: product.stock,
      status: product.status,
      image_url: product.image_url || "",
    });
    setIsNewCategory(false);
    setNewCategoryName("");
    setShowModal(true);
  };

  const handleNewAction = () => {
    setEditProductObj(null);
    setForm({
      name: "",
      code: generateSku(),
      category: "Furniture",
      type: "Goods",
      salesPrice: "",
      costPrice: "",
      stock: "",
      status: "Active",
      image_url: "",
    });
    setIsNewCategory(false);
    setNewCategoryName("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "category") {
      if (value === "__create_new__") {
        setIsNewCategory(true);
        setNewCategoryName("");
        return;
      }
      setIsNewCategory(false);
    }
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Image compression & upload handler
  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 600;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        } else if (h > MAX) {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setForm((prev) => ({ ...prev, image_url: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setForm((prev) => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveProduct = async (e) => {
    if (e) e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter Product Name");
      return;
    }

    const finalCategory = isNewCategory
      ? (newCategoryName.trim() || "Furniture")
      : (form.category.trim() || "Furniture");

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.code.trim() || generateSku(),
        category: finalCategory,
        type: form.type,
        unit: form.type === "Service" ? "Service" : "Unit",
        image_url: form.image_url || null,
        sale_price: form.salesPrice ? Number(form.salesPrice) : 0,
        purchase_price: form.costPrice ? Number(form.costPrice) : 0,
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
                  <th>Cost</th>
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
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="product-table-img"
                            />
                          ) : (
                            <div className="product-icon">📦</div>
                          )}
                          <div>
                            <b>{product.name}</b>
                            <small>{product.type || "Goods"}</small>
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
                        ₹{product.costPrice.toLocaleString("en-IN")}
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

                <span className="product-card-badge-type">
                  {product.type}
                </span>
              </div>

              {/* Product Image preview in card */}
              <div className="product-card-media">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="product-card-img"
                  />
                ) : (
                  <div className="product-card-no-img">
                    <span className="product-icon-box">📦</span>
                  </div>
                )}
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
                  <span>Cost</span>
                  <strong>
                    ₹{product.costPrice.toLocaleString("en-IN")}
                  </strong>
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

      {/* PRODUCT MASTER FORM MODAL (Matches Mockup) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="product-modal product-master-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar matching mockup: New, Confirm, Back */}
            <div className="product-master-topbar">
              <div className="product-master-buttons-left">
                <button
                  type="button"
                  className="pm-btn pm-btn-new"
                  onClick={handleNewAction}
                >
                  New
                </button>

                <button
                  type="button"
                  className="pm-btn pm-btn-confirm"
                  onClick={saveProduct}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Confirm"}
                </button>
              </div>

              <div className="product-master-title">
                Product Master Form View
              </div>

              <div className="product-master-buttons-right">
                <button
                  type="button"
                  className="pm-btn pm-btn-back"
                  onClick={() => setShowModal(false)}
                >
                  Back
                </button>
              </div>
            </div>

            <form onSubmit={saveProduct} className="product-master-form">
              {/* Product Name */}
              <div className="pm-field-row">
                <label className="pm-label">Product Name *</label>
                <div className="pm-input-wrap">
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Ergonomic Office Desk"
                    className="pm-input pm-input-underline"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Product Type dropdown: Goods, Service, Combo */}
              <div className="pm-field-row">
                <label className="pm-label">Product Type</label>
                <div className="pm-input-wrap">
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="pm-select pm-select-underline"
                  >
                    <option value="Goods">Goods</option>
                    <option value="Service">Service</option>
                    <option value="Combo">Combo</option>
                  </select>
                </div>
              </div>

              {/* Category: Selection / Many2one field */}
              <div className="pm-field-row">
                <label className="pm-label">Category</label>
                <div className="pm-input-wrap">
                  {!isNewCategory ? (
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="pm-select pm-select-underline"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__create_new__">
                        + Create New Category...
                      </option>
                    </select>
                  ) : (
                    <div className="pm-new-category-box">
                      <input
                        type="text"
                        placeholder="Enter new category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="pm-input pm-input-underline"
                      />
                      <button
                        type="button"
                        className="pm-btn-cancel-category"
                        onClick={() => setIsNewCategory(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lower Section: Upload Image on Left, Price / Cost / SKU on Right */}
              <div className="pm-lower-grid">
                {/* Image Upload Box */}
                <div className="pm-image-column">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    style={{ display: "none" }}
                    onChange={handleFileInputChange}
                  />

                  <div
                    className={`pm-image-upload-box ${
                      form.image_url ? "has-image" : ""
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {form.image_url ? (
                      <div className="pm-image-preview-wrapper">
                        <img
                          src={form.image_url}
                          alt="Uploaded product preview"
                          className="pm-image-preview"
                        />
                        <div className="pm-image-hover-overlay">
                          <span>Click to change</span>
                          <button
                            type="button"
                            className="pm-image-remove-btn"
                            onClick={handleRemoveImage}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pm-upload-prompt">
                        <div className="pm-upload-icon">📷</div>
                        <span className="pm-upload-title">Upload Image</span>
                        <span className="pm-upload-hint">
                          Click or drag image here
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing & Code Column */}
                <div className="pm-pricing-column">
                  {/* Sales Price */}
                  <div className="pm-field-row-compact">
                    <label className="pm-label">Sales Price</label>
                    <div className="pm-currency-input">
                      <span className="pm-currency-prefix">Rs.</span>
                      <input
                        type="number"
                        name="salesPrice"
                        value={form.salesPrice}
                        onChange={handleChange}
                        placeholder="100.00"
                        min="0"
                        step="any"
                        className="pm-input pm-input-underline"
                      />
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="pm-field-row-compact">
                    <label className="pm-label">Cost</label>
                    <div className="pm-currency-input">
                      <span className="pm-currency-prefix">Rs.</span>
                      <input
                        type="number"
                        name="costPrice"
                        value={form.costPrice}
                        onChange={handleChange}
                        placeholder="50.00"
                        min="0"
                        step="any"
                        className="pm-input pm-input-underline"
                      />
                    </div>
                  </div>

                  {/* Product Code */}
                  <div className="pm-field-row-compact">
                    <label className="pm-label">Product Code (SKU)</label>
                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="PRD-001"
                      className="pm-input pm-input-underline"
                    />
                  </div>

                  {/* Status */}
                  <div className="pm-field-row-compact">
                    <label className="pm-label">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="pm-select pm-select-underline"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bottom Actions for mobile / backup */}
              <div className="pm-footer-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Product"}
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