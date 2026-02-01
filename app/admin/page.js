"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 10;

export default function AdminPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    source: "",
    attribution: "",
  });

  const router = useRouter();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const res = await fetch("/api/admin/images");
      const data = await res.json();
      setImages(
      (data.images || []).sort(
        (a, b) => new Date(b.addedAt) - new Date(a.addedAt)
      )
    );

    } catch (err) {
      console.error("Failed to fetch images:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);
  const paginatedImages = images.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetPaging = () => setCurrentPage(1);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchImages();
        resetPaging();
        setShowAddForm(false);
        setFormData({ url: "", title: "", source: "", attribution: "" });
      }
    } catch (err) {
      console.error("Failed to add image:", err);
    }
  };

  const handleUpdate = async (index) => {
    try {
      const res = await fetch("/api/admin/images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, ...formData }),
      });
      if (res.ok) {
        await fetchImages();
        resetPaging();
        setEditingIndex(null);
        setFormData({ url: "", title: "", source: "", attribution: "" });
      }
    } catch (err) {
      console.error("Failed to update image:", err);
    }
  };

  const handleDelete = async (url) => {
    try {
      console.log("Deleting image with URL:", url);
      const res = await fetch(`/api/admin/images?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      console.log("Delete response:", res.status, res.ok);
      if (res.ok) {
        const data = await res.json();
        console.log("Deleted:", data);

        // Force refresh
        router.refresh();
        await fetchImages();
        resetPaging();

        console.log("Images after delete:", images.length);
      } else {
        const error = await res.json();
        console.error("Delete failed:", error);
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
    }
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setFormData(images[index]);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setFormData({ url: "", status: "active", source: "", notes: "" });
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  if (loading) {
    return <div className="p-8">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Image Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingIndex(null);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {showAddForm ? "Cancel" : "Add New Image"}
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="bg-white p-6 rounded shadow mb-8">
            <h2 className="text-xl font-bold mb-4">Add Image</h2>
            <ImageForm formData={formData} setFormData={setFormData} />
            <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded">
              Add
            </button>
          </form>
        )}

        <div className="grid gap-6">
          {paginatedImages.map((image, index) => {
            const realIndex =
              (currentPage - 1) * ITEMS_PER_PAGE + index;
            return (
              <ImageCard
                key={image.url}
                image={image}
                isEditing={editingIndex === realIndex}
                formData={formData}
                setFormData={setFormData}
                onEdit={() => startEdit(realIndex)}
                onSave={() => handleUpdate(realIndex)}
                onCancel={cancelEdit}
                onDelete={() => handleDelete(image.url)}
              />
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Shared Components ---------- */

function ImageForm({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <input
        type="url"
        required
        placeholder="Image URL"
        value={formData.url}
        onChange={(e) =>
          setFormData({ ...formData, url: e.target.value })
        }
        className="w-full border px-3 py-2 rounded"
      />

      <select
        value={formData.status}
        onChange={(e) =>
          setFormData({ ...formData, status: e.target.value })
        }
        className="w-full border px-3 py-2 rounded"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>

      <input
        type="text"
        placeholder="Source"
        value={formData.source}
        onChange={(e) =>
          setFormData({ ...formData, source: e.target.value })
        }
        className="w-full border px-3 py-2 rounded"
      />

      <textarea
        rows="3"
        placeholder="Notes"
        value={formData.notes}
        onChange={(e) =>
          setFormData({ ...formData, notes: e.target.value })
        }
        className="w-full border px-3 py-2 rounded"
      />
    </div>
  );
}

function ImageCard({
  image,
  isEditing,
  formData,
  setFormData,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  return (
    <div className="bg-white rounded shadow flex overflow-hidden">
      <a
        href={image.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-64 h-40 flex-shrink-0"
      >
        <img
          src={image.url}
          className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
          alt=""
          onError={(e) => (e.target.style.display = "none")}
        />
      </a>
      <div className="p-6 flex-1">
        {isEditing ? (
          <>
            <ImageForm formData={formData} setFormData={setFormData} />
            <div className="mt-4 flex gap-2">
              <button
                onClick={onSave}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                className="bg-gray-400 text-white px-3 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">
                {image.status}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  className="text-blue-600 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  className="text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="text-sm break-all">{image.url}</p>
          </>
        )}
      </div>
    </div>
  );
}
