import { useState } from "react";

function Products() {
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [products, setProducts] = useState([
    {
      name: "Office Chair",
      code: "PRD-001",
      category: "Furniture",
      type: "Goods",
      salesPrice: 4500,
      purchasePrice: 3000,
      stock: 25,
      status: "Active",
    },
    {
      name: "Wooden Table",
      code: "PRD-002",
      category: "Furniture",
      type: "Goods",
      salesPrice: 8500,
      purchasePrice: 6000,
      stock: 15,
      status: "Active",
    },
    {
      name: "Sofa Set",
      code: "PRD-003",
      category: "Furniture",
      type: "Goods",
      salesPrice: 25000,
      purchasePrice: 18000,
      stock: 8,
      status: "Active",
    },
    {
      name: "LED Lamp",
      code: "PRD-004",
      category: "Lighting",
      type: "Goods",
      salesPrice: 1800,
      purchasePrice: 1100,
      stock: 40,
      status: "Active",
    },
  ]);

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

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.code} ${product.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditIndex(null);

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

  const openEditModal = (index) => {
    const product = products[index];

    setEditIndex(index);
    setForm(product);
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const saveProduct = (e) => {
    e.preventDefault();

    if (!form.name || !form.code) {
      alert("Please enter Product Name and Product Code");
      return;
    }

    const newProduct = {
      ...form,
      salesPrice: Number(form.salesPrice) || 0,
      purchasePrice: Number(form.purchasePrice) || 0,
      stock: Number(form.stock) || 0,
    };

    if (editIndex === null) {
      setProducts([...products, newProduct]);
    } else {
      const updatedProducts = [...products];
      updatedProducts[editIndex] = newProduct;
      setProducts(updatedProducts);
    }

    setShowModal(false);
  };

  const deleteProduct = (index) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    setProducts(products.filter((_, i) => i !== index));
  };

  return (
    <div className="product-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <p className="breadcrumb">
            Home / Products
          </p>

          <h1>Products</h1>

          <p className="subtitle">
            Manage your products and inventory
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={openAddModal}
        >
          + New Product
        </button>
      </div>

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

                {filteredProducts.map((product, index) => (

                  <tr key={index}>

                    <td>
                      <div className="product-cell">

                        <div className="product-icon">
                          📦
                        </div>

                        <div>
                          <b>{product.name}</b>

                          <small>
                            Product
                          </small>
                        </div>

                      </div>
                    </td>

                    <td>
                      <span className="product-code">
                        {product.code}
                      </span>
                    </td>

                    <td>
                      {product.category}
                    </td>

                    <td>
                      {product.type}
                    </td>

                    <td>
                      ₹{product.salesPrice.toLocaleString("en-IN")}
                    </td>

                    <td>
                      ₹{product.purchasePrice.toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span
                        className={
                          product.stock <= 10
                            ? "stock-low"
                            : "stock-good"
                        }
                      >
                        {product.stock}
                      </span>
                    </td>

                    <td>
                      <span className="product-status">
                        {product.status}
                      </span>
                    </td>

                    <td>

                      <button
                        className="small-btn"
                        onClick={() =>
                          openEditModal(index)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          deleteProduct(index)
                        }
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (

        <div className="product-kanban">

          {filteredProducts.map((product, index) => (

            <div
              className="product-card"
              key={index}
            >

              <div className="product-card-header">

                <div className="big-product-icon">
                  📦
                </div>

                <span className="product-status">
                  {product.status}
                </span>

              </div>

              <h3>
                {product.name}
              </h3>

              <p className="product-card-code">
                {product.code}
              </p>

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
                  onClick={() =>
                    openEditModal(index)
                  }
                >
                  Edit
                </button>

                <button
                  className="delete-btn"
                  onClick={() =>
                    deleteProduct(index)
                  }
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>
      )}

      {/* EMPTY */}
      {filteredProducts.length === 0 && (

        <div className="empty-card">

          <div className="empty-icon">
            📦
          </div>

          <h2>
            No Products Found
          </h2>

          <p>
            Try another search or create a new product.
          </p>

        </div>
      )}

      {/* MODAL */}
      {showModal && (

        <div className="modal-overlay">

          <div className="product-modal">

            <div className="modal-header">

              <div>
                <h2>
                  {editIndex === null
                    ? "Create Product"
                    : "Edit Product"}
                </h2>

                <p>
                  Enter product information
                </p>
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

                <h3>
                  Basic Information
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Product Name *
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter product name"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Product Code *
                    </label>

                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="PRD-001"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Category
                    </label>

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

                    <label>
                      Product Type
                    </label>

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

                <h3>
                  Pricing & Inventory
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Sales Price
                    </label>

                    <input
                      type="number"
                      name="salesPrice"
                      value={form.salesPrice}
                      onChange={handleChange}
                      placeholder="0"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Purchase Price
                    </label>

                    <input
                      type="number"
                      name="purchasePrice"
                      value={form.purchasePrice}
                      onChange={handleChange}
                      placeholder="0"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Stock Quantity
                    </label>

                    <input
                      type="number"
                      name="stock"
                      value={form.stock}
                      onChange={handleChange}
                      placeholder="0"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Status
                    </label>

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

              <div className="modal-footer">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editIndex === null
                    ? "Create Product"
                    : "Save Changes"}
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