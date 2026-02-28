# Xians API Access

Presentation layer must not directly reference xians APIs (i.e. starting with /api/v1/admin/*) but should call the Next.js API routes instead. API routes can call xians apis.
