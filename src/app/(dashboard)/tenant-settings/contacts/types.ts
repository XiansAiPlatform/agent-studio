export interface Contact {
  id: string
  tenantId: string
  name: string
  email: string
  phone?: string | null
  createdAt: string
  createdBy: string
  updatedAt?: string | null
  updatedBy?: string | null
}

export interface ContactRequest {
  name: string
  email: string
  /** An empty string clears the phone on update. */
  phone?: string
}
