# Environmental Express Argentina - Sistema de Gestión de Seguridad e Higiene

## Overview

A responsive web application for field data collection and reporting of occupational safety and hygiene measurements according to Argentine regulations (SRT protocols). The system enables technicians to record environmental measurements (lighting, noise, thermal load, thickness/pressure vessels, etc.) by sector/work area, manage clients and instruments, generate professional technical reports in PDF/DOCX formats, and maintain inspection history. Includes AI-powered electrical panel analyzer using OpenAI Vision for photo-based inspection reports, and pressure vessel thickness measurement with ASME Section VIII Div. 1 calculations (PMTA).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: Zustand with persistence middleware for local state; React Query for server state
- **UI Components**: Radix UI primitives with shadcn/ui component library (new-york style)
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Development**: Vite dev server middleware integration for HMR

### Data Storage
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts` using Drizzle table definitions
- **Migrations**: Drizzle Kit with output to `./migrations` directory
- **Client Persistence**: Zustand persist middleware for offline-capable local storage

### Key Entities
- **Users**: Basic auth with roles (admin/operator)
- **Rubros**: Industry categories with predefined sectors
- **Clients**: Company information with IVA conditions and contact details
- **Instruments**: Measurement equipment with calibration tracking
- **Inspections**: Complete measurement sessions with establishment data and sector measurements

### Report Generation
- **PDF**: jsPDF with autoTable plugin for professional technical documents
- **DOCX**: docx library for editable Word documents
- Both formats follow Argentine SRT protocol standards with proper headers, footers, and legal frameworks

### Authentication
- Simple role-based auth stored in Zustand with persistence
- Two roles: `admin` (full access) and `operator` (limited access)
- Mock login for development (admin/admin, operador/operador)

## External Dependencies

### Database
- PostgreSQL database required via `DATABASE_URL` environment variable
- Drizzle Kit for schema migrations (`npm run db:push`)

### Key Libraries
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm + pg**: PostgreSQL database access
- **jspdf + jspdf-autotable**: PDF report generation
- **docx + file-saver**: Word document generation
- **date-fns**: Date formatting with Spanish locale support
- **zod + drizzle-zod**: Schema validation

### UI Framework
- Full Radix UI primitive set for accessible components
- Lucide React for icons
- Class Variance Authority for component variants
- Tailwind CSS with custom theme variables matching corporate branding (navy blue #003366)

### Development Tools
- Vite with React plugin
- TypeScript with strict mode
- Replit-specific plugins for error overlay and dev banner