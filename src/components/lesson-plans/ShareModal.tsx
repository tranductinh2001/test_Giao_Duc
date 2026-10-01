"use client";

import { useState } from "react";
import { X, UserPlus, Mail, Shield } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface ShareModalProps {
  lessonPlanId: string;
  isOpen: boolean;
  onClose: () => void;
  onCollaboratorAdded?: () => void;
}

interface Collaborator {
  id: string;
  userId: string;
  role: "VIEWER" | "EDITOR";
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  inviter: {
    name: string;
  };
}

export default function ShareModal({
  lessonPlanId,
  isOpen,
  onClose,
  onCollaboratorAdded,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  const fetchCollaborators = async () => {
    setLoadingCollaborators(true);
    try {
      const res = await fetch(`/api/lesson-plans/${lessonPlanId}/collaborators`);
      const data = await res.json();

      if (data.success) {
        setCollaborators(data.data);
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/lesson-plans/${lessonPlanId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setEmail("");
        fetchCollaborators();
        onCollaboratorAdded?.();
      } else {
        toast.error(data.message || "Lỗi khi thêm cộng tác viên");
      }
    } catch (error) {
      console.error("Error adding collaborator:", error);
      toast.error("Lỗi khi thêm cộng tác viên");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm("Bạn có chắc muốn xóa cộng tác viên này?")) {
      return;
    }

    try {
      const res = await fetch(
        `/api/lesson-plans/${lessonPlanId}/collaborators/${collaboratorId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        fetchCollaborators();
        onCollaboratorAdded?.();
      } else {
        toast.error(data.message || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error("Lỗi khi xóa cộng tác viên");
    }
  };

  const handleChangeRole = async (collaboratorId: string, newRole: "VIEWER" | "EDITOR") => {
    try {
      const res = await fetch(
        `/api/lesson-plans/${lessonPlanId}/collaborators/${collaboratorId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        fetchCollaborators();
        onCollaboratorAdded?.();
      } else {
        toast.error(data.message || "Lỗi khi cập nhật");
      }
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Lỗi khi cập nhật quyền");
    }
  };

  // Fetch collaborators when modal opens
  if (isOpen && collaborators.length === 0 && !loadingCollaborators) {
    fetchCollaborators();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Chia sẻ giáo án
              </h2>
              <p className="text-sm text-muted-foreground">
                Mời người khác xem hoặc chỉnh sửa giáo án
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add collaborator form */}
        <form onSubmit={handleAddCollaborator} className="p-6 border-b border-border">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email người dùng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "VIEWER" | "EDITOR")}
              className="h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            >
              <option value="VIEWER">👁️ Xem</option>
              <option value="EDITOR">✏️ Chỉnh sửa</option>
            </select>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              disabled={loading}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Thêm
            </Button>
          </div>
        </form>

        {/* Collaborators list */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            CÓ QUYỀN TRUY CẬP ({collaborators.length})
          </h3>

          {loadingCollaborators ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chưa có cộng tác viên nào
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {collaborator.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {collaborator.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {collaborator.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Được mời bởi {collaborator.inviter.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={collaborator.role}
                      onChange={(e) =>
                        handleChangeRole(
                          collaborator.id,
                          e.target.value as "VIEWER" | "EDITOR"
                        )
                      }
                      className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    >
                      <option value="VIEWER">👁️ Xem</option>
                      <option value="EDITOR">✏️ Chỉnh sửa</option>
                    </select>
                    <button
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Xóa cộng tác viên"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
