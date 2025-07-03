# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start the development environment (builds and runs Electron app)
- `npm run dev` - Start webpack dev server for web development
- `npm run build` - Build for production
- `npm run build:watch` - Build and watch for changes
- `npm run electron` - Run the Electron app
- `npm run lint` - Run ESLint on TypeScript files

## Architecture

This is an Electron + React + TypeScript inventory management application with the following structure:

- **Main Process**: `public/main.js` - Electron main process entry point
- **Renderer Process**: `src/` - React application (TypeScript)
- **Build System**: Webpack with TypeScript support
- **UI Framework**: React with CSS modules/styled components
- **Target**: Desktop application with modern UI

### Key Components

- `src/components/` - Reusable UI components
- `src/types/` - TypeScript type definitions for inventory items
- `src/data/` - Mock data and data management utilities
- `src/hooks/` - Custom React hooks for state management

### Inventory Data Model

The application uses a standardized inventory item interface with fields for:
- Basic info (name, description, SKU)
- Quantities (stock, reserved, available)
- Pricing and supplier information
- Categories and status tracking

### UI Design Principles

- Modern gradient backgrounds and glass-morphism effects
- Clean, spacious layouts with subtle shadows
- Responsive grid systems for inventory display
- Smooth animations and hover effects
- Professional color scheme with blue/purple gradients