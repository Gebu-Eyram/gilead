"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTeamStore } from "@/store/team-store";
import { toast } from "sonner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Company, CreateCompanyInput } from "@/utils/types";
import Link from "next/link";

function CreateCompanySheet({
  onCreated,
}: {
  onCreated?: (company: Company) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCompanyInput>({
    name: "",
    location: "",
    type: "",
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (data: CreateCompanyInput) => {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create company");
      return res.json() as Promise<Company>;
    },
    onSuccess: (newCompany) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created successfully");
      onCreated?.(newCompany);
      setFormData({ name: "", location: "", type: "" });
      setOpen(false);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Company
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col  sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>Create Company</SheetTitle>
          <SheetDescription>Add a new company to the system</SheetDescription>
        </SheetHeader>

        <form
          id="create-company-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutate(formData);
          }}
          className="flex-1 overflow-y-auto space-y-8 py-4 px-4 pr-1"
        >
          <div className="space-y-3">
            <Label htmlFor="name" className="text-base font-semibold">
              Name
            </Label>
            <Input
              id="name"
              placeholder="company_name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Recommended to use lowercase and use an underscore to separate
              words
              <br />
              e.g. company_name
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="location" className="text-base font-semibold">
                Location
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="location"
              placeholder="e.g., San Francisco, CA"
              value={formData.location || ""}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="type" className="text-base font-semibold">
                Company Type
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="type"
              placeholder="e.g., Startup, Enterprise"
              value={formData.type || ""}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error.message}</p>}
        </form>

        <SheetFooter className="border-t pt-4 flex flex-row items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className=""
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-company-form"
            disabled={isPending}
            className=""
          >
            {isPending ? "Creating..." : "Save Company"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EditCompanySheet({
  company,
  open,
  onOpenChange,
}: {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateCompanyInput>({
    name: company.name,
    location: company.location ?? "",
    type: company.type ?? "",
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (data: CreateCompanyInput) => {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update company");
      return res.json() as Promise<Company>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated successfully");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-lg!">
        <SheetHeader className="border-b">
          <SheetTitle>Edit Company</SheetTitle>
          <SheetDescription>Update company details</SheetDescription>
        </SheetHeader>

        <form
          id="edit-company-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutate(formData);
          }}
          className="flex-1 overflow-y-auto space-y-8 py-4 px-4 pr-1"
        >
          <div className="space-y-3">
            <Label htmlFor="edit-name" className="text-base font-semibold">
              Name
            </Label>
            <Input
              id="edit-name"
              placeholder="company_name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="edit-location"
                className="text-base font-semibold"
              >
                Location
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="edit-location"
              placeholder="e.g., San Francisco, CA"
              value={formData.location || ""}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="text-sm"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-type" className="text-base font-semibold">
                Company Type
              </Label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <Input
              id="edit-type"
              placeholder="e.g., Startup, Enterprise"
              value={formData.type || ""}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error.message}</p>}
        </form>

        <SheetFooter className="border-t pt-4 flex flex-row items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-company-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DeleteCompanyDialog({
  company,
  open,
  onOpenChange,
}: {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete company");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Company</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{company.name}</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate()}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{company.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 -mt-1 -mr-2"
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {company.location && (
          <p className="text-sm text-muted-foreground mt-2">
            {company.location}
          </p>
        )}
        {company.type && (
          <p className="text-sm text-muted-foreground">Type: {company.type}</p>
        )}

        <div className="border-t mt-4 pt-4">
          <Link
            href={`/companies/${company.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View Details
          </Link>
        </div>
      </div>

      <EditCompanySheet
        company={company}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCompanyDialog
        company={company}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

export default function CompaniesPage() {
  const currentRole = useTeamStore((state) => state.currentRole);

  const {
    data: companies = [],
    isLoading,
    error,
  } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => fetch("/api/companies").then((r) => r.json()),
    enabled: currentRole === "superadmin",
    staleTime: 1000 * 60 * 5,
  });

  if (currentRole !== "superadmin") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockKeyhole className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Access Denied</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>
            You don&apos;t have permission to access this page. Only superadmins
            can view companies.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">
          Loading companies...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Error Loading Companies</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>{(error as Error).message}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  if (companies.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No Companies</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>
            No companies have been created yet. Create your first company to get
            started.
          </EmptyDescription>
          <div className="mt-4">
            <CreateCompanySheet />
          </div>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
            <p className="text-muted-foreground mt-2">
              Manage all companies in the system
            </p>
          </div>
          <CreateCompanySheet />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      </div>
    </div>
  );
}
