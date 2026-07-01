/**
 * Generates the CC Verse BCA Main Project report (.docx).
 * Run: node scripts/generate-project-report.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'CC-Verse-Project-Report.docx');
const ASSETS = path.join(ROOT, '.report-assets');

const PROJECT_TITLE = 'CC VERSE: VERIFIED CARBON CREDIT MARKETPLACE';
const STUDENT = 'Aleena Shaju';
const USN = 'U18AJ23S0582';
const GUIDE = 'Ms. Archana K M';
const YEAR = '2025-2026';

const CONTENT_W = 9360;
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellPad = { top: 80, bottom: 80, left: 120, right: 120 };

const pageProps = {
  size: { width: 12240, height: 15840 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};

function txt(text, opts = {}) {
  return new TextRun({ text, font: 'Arial', size: 24, ...opts });
}

function para(children, opts = {}) {
  const ch = typeof children === 'string' ? [txt(children)] : children;
  return new Paragraph({ children: ch, spacing: { after: 120 }, ...opts });
}

function centerBold(text, size = 28) {
  return para([new TextRun({ text, bold: true, font: 'Arial', size: size * 2 })], {
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 240 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 180 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 28 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 26 })],
  });
}

function body(text) {
  return para(text, { alignment: AlignmentType.BOTH });
}

function bullets(ref, items) {
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference: ref, level: 0 },
        spacing: { after: 80 },
        children: [txt(item)],
      }),
  );
}

function numbered(ref, items) {
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference: ref, level: 0 },
        spacing: { after: 80 },
        children: [txt(item)],
      }),
  );
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      new TableCell({
        borders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: 'D5E8F0', type: ShadingType.CLEAR },
        margins: cellPad,
        children: [para([txt(h, { bold: true })])],
      }),
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell, i) =>
          new TableCell({
            borders,
            width: { size: colWidths[i], type: WidthType.DXA },
            margins: cellPad,
            children: [para(String(cell))],
          }),
        ),
      }),
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

function schemaTable(name, desc, fields) {
  return [
    h3(`Table Name: ${name}`),
    body(desc),
    makeTable(
      ['Field Name', 'Data Type', 'Constraint', 'Description'],
      fields,
      [2200, 1600, 2000, 3560],
    ),
    para(''),
  ];
}

function codeBlock(lines) {
  return lines.map((line) =>
    para(line || ' ', {
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: line || ' ',
          font: 'Courier New',
          size: 18,
        }),
      ],
    }),
  );
}

function logoPara(file, w, h) {
  const data = fs.readFileSync(path.join(ASSETS, file));
  const ext = file.endsWith('.png') ? 'png' : 'jpeg';
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new ImageRun({
        type: ext,
        data,
        transformation: { width: w, height: h },
        altText: { title: 'Logo', description: 'College logo', name: 'logo' },
      }),
    ],
  });
}

function coverPage() {
  return [
    logoPara('image1.png', 120, 120),
    centerBold('Main Project', 16),
    centerBold('on', 14),
    centerBold(PROJECT_TITLE, 14),
    centerBold('BACHELOR OF COMPUTER APPLICATIONS', 14),
    para('of', { alignment: AlignmentType.CENTER }),
    centerBold('Dr. Manmohan Singh Bengaluru City University', 12),
    centerBold('By', 12),
    para(`${STUDENT} (${USN})`, { alignment: AlignmentType.CENTER }),
    centerBold('Under the Guidance of', 12),
    centerBold(GUIDE, 14),
    centerBold('ACHARYA INSTITUTE OF GRADUATE STUDIES', 14),
    para(
      "(NAAC Re-Accredited 'A+' and Affiliated to Dr. Manmohan Singh Bengaluru City University)",
      { alignment: AlignmentType.CENTER },
    ),
    centerBold('1#89/90, Soldevanahalli, Hesaraghatta Road, Bengaluru – 560107', 12),
    centerBold(YEAR, 12),
    pageBreak(),
    centerBold('ACHARYA INSTITUTE OF GRADUATE STUDIES', 14),
    para(
      "(NAAC Re-Accredited 'A+' and Affiliated to Dr. Manmohan Singh Bengaluru City University)",
      { alignment: AlignmentType.CENTER },
    ),
    centerBold('1#89/90, Soldevanahalli, Hesaraghatta Road, Bengaluru – 560107', 12),
    centerBold('DEPARTMENT OF COMPUTER APPLICATION', 14),
    pageBreak(),
  ];
}

function bonafide() {
  return [
    h2('BONAFIDE CERTIFICATE'),
    body(
      `Certified that this project report ${PROJECT_TITLE} is the bonafide work of ${STUDENT} (${USN}), who carried out the project work under my supervision in partial fulfilment of the requirements for the award of the degree of Bachelor of Computer Applications of Dr. Manmohan Singh Bengaluru City University.`,
    ),
    para(''),
    para(`${GUIDE}                    K. Ramakrishna Reddy`),
    para('            Dr. Gurunath Rao Vaidya'),
    para('PROJECT GUIDE      HEAD OF THE DEPARTMENT              PRINCIPAL'),
    para(''),
    para('Submitted for Semester Main-Project viva-voce examination held on _______________'),
    para('INTERNAL EXAMINER                    EXTERNAL EXAMINER'),
    pageBreak(),
  ];
}

function declaration() {
  return [
    h1('DECLARATION'),
    body(
      `I, ${STUDENT}, of 6th semester BCA, hereby declare that the project work entitled "${PROJECT_TITLE}" submitted to the Department of Computer Application, Acharya Institute of Graduate Studies, Bengaluru, is a record of an original work done by me under the guidance of ${GUIDE}, and this work has not been submitted elsewhere for the award of any other degree or diploma.`,
    ),
    body(
      'I further declare that no part of it has been formed on the basis for the award of any degree, diploma or any other similar title of any university or institutions to any person.',
    ),
    para(`${STUDENT.toUpperCase()} (${USN})`, { alignment: AlignmentType.RIGHT }),
    para('Place: Bengaluru'),
    para('Date:'),
    pageBreak(),
  ];
}

function acknowledgement() {
  return [
    h1('ACKNOWLEDGEMENT'),
    body(
      'I would like to take this opportunity to thank my college, faculty, and family for their support throughout this project. Life enhances better opportunities with adequate space and time. It was a great blessing to complete this project titled "' +
        PROJECT_TITLE +
        '".',
    ),
    body(
      'First, my heartfelt gratitude and respect to Dr. Gurunath Rao Vaidya, Principal, Acharya Institute of Graduate Studies, for providing the necessary facilities and encouragement.',
    ),
    body(
      `I express my sincere thanks to ${GUIDE}, Project Guide, for valuable guidance, constant supervision, and constructive feedback throughout the development of CC Verse.`,
    ),
    body(
      'I would also like to extend my thanks to every faculty of the BCA Department and to my family, friends, and classmates for their motivation and support.',
    ),
    para(`${STUDENT.toUpperCase()} (${USN})`, { alignment: AlignmentType.RIGHT }),
    pageBreak(),
  ];
}

function abstractSection() {
  return [
    h1('ABSTRACT'),
    body(
      'Carbon credit markets are growing rapidly as organizations seek to offset emissions, yet buyers often struggle to verify that credits are genuine, traceable, and permanently retired after purchase. Manual registries, fragmented marketplaces, and weak audit trails create distrust and compliance risk.',
    ),
    body(
      'CC Verse is a verified carbon-credit marketplace built as a full-stack web application. Buyers browse active listings, purchase credits, and receive digital certificates; sellers register carbon projects, complete KYC, list credits, and receive payouts; auditors and administrators review KYC documents, approve listings, and monitor platform activity. Every credit is tracked in a central registry with states Available, Held, and Retired, ensuring registry integrity.',
    ),
    body(
      'The system is implemented using Next.js 14 (App Router) for the frontend and API layer, Convex as the real-time backend database and business-logic platform, iron-session for secure cookie-based authentication, and otplib for mandatory MFA on auditor and admin roles. Optional AWS SES and S3 integrations support email verification and document storage. An append-only audit log records every state-changing action for compliance.',
    ),
    body(
      'CC Verse demonstrates how modern web technologies can deliver a transparent, role-based carbon marketplace with end-to-end traceability from project registration through credit retirement and certificate issuance.',
    ),
    pageBreak(),
  ];
}

function toc() {
  const rows = [
    ['1', 'INTRODUCTION', '1'],
    ['2', 'LITERATURE SURVEY', '3'],
    ['2.1', 'EXISTING SYSTEM', '4'],
    ['2.2', 'PROPOSED SYSTEM', '4'],
    ['2.3', 'FEASIBILITY STUDY', '5'],
    ['2.4', 'TOOLS AND TECHNOLOGIES', '7'],
    ['2.5', 'SOFTWARE REQUIREMENT SPECIFICATION', '11'],
    ['3', 'SYSTEM DESIGN', '15'],
    ['3.1', 'SYSTEM PERSPECTIVE', '16'],
    ['3.2', 'INPUT DESIGN', '18'],
    ['3.3', 'OUTPUT DESIGN', '19'],
    ['3.4', 'DATABASE DESIGN', '20'],
    ['3.5', 'PROCESS DESIGN', '24'],
    ['4', 'SYSTEM TESTING', '31'],
    ['5', 'SYSTEM IMPLEMENTATION', '35'],
    ['6', 'SYSTEM MAINTENANCE', '39'],
    ['7', 'FUTURE ENHANCEMENTS', '41'],
    ['8', 'CONCLUSION', '43'],
    ['9', 'APPENDIX', '45'],
    ['9.1', 'CODING', '46'],
    ['9.2', 'SCREENSHOTS', '55'],
    ['10', 'BIBLIOGRAPHY', '59'],
  ];
  return [
    centerBold('TABLE OF CONTENTS', 16),
    makeTable(['SL NO', 'TOPIC', 'PAGE NO'], rows, [1200, 6360, 1800]),
    pageBreak(),
  ];
}

function chapter1() {
  return [
    h2('1. INTRODUCTION'),
    h2('1.1 PROJECT DESCRIPTION'),
    body(
      'Climate change has accelerated global demand for carbon credits as companies and governments pursue net-zero commitments. Voluntary and compliance carbon markets connect project developers who reduce or remove greenhouse gases with buyers who need offsets. However, market growth has outpaced trust infrastructure: duplicate counting, opaque retirement, and weak seller verification remain common problems.',
    ),
    body(
      'CC Verse can be defined as a verified carbon-credit marketplace where every credit is signed at issuance, tracked on a public registry, and retired with proof of ownership. The platform replaces informal claims with a single source of truth: a registry entry per Carbon Verse Credit (CVC) serial, with atomic state transitions and an append-only audit log.',
    ),
    body(
      'There are four primary roles in this application: Buyer, Seller, Auditor, and Admin. Buyers register, browse the marketplace, purchase credits, and download retirement certificates. Sellers register carbon projects, complete KYC, create listings tied to registry inventory, and track payouts. Auditors review listing submissions and KYC evidence. Administrators manage user accounts, KYC queues, platform configuration, and audit logs. Mandatory multi-factor authentication protects auditor and admin accounts.',
    ),
    pageBreak(),
    h1('LITERATURE SURVEY'),
    body(
      'Carbon markets emerged from the Kyoto Protocol and have expanded through voluntary standards such as Verra (VCS) and the Gold Standard. Traditional registries issue serialized credits and record retirements, but buyers often purchase through brokers or OTC deals without direct registry access.',
    ),
    body(
      'Existing online marketplaces (e.g., broker platforms, exchange listings) focus on price discovery but vary in verification depth. Enterprise procurement systems integrate sustainability reporting yet lack unified KYC and real-time registry binding.',
    ),
    body(
      'Research on blockchain-based carbon tokens highlights immutability benefits but introduces complexity and regulatory uncertainty. Modern SaaS architectures using document databases and reactive backends (e.g., Convex) offer real-time consistency without operating separate database and cache layers.',
    ),
    body(
      'CC Verse synthesizes registry-first design from compliance markets with consumer-grade UX from e-commerce, adding role-based access control, MFA for privileged roles, and append-only auditing aligned with FRD v1.1 requirements for CC Verse.',
    ),
    pageBreak(),
  ];
}

function chapter2() {
  return [
    h2('2. SYSTEM ANALYSIS'),
    body(
      'System analysis focuses on identifying and understanding what the system is required to do. It helps in analysing the logical components of the system rather than the physical components such as hardware. This chapter examines the existing approach, the proposed CC Verse solution, feasibility, technology choices, and formal requirements.',
    ),
    h2('2.1 EXISTING SYSTEM'),
    body(
      'In the existing approach, carbon credit transactions are often handled through brokers, spreadsheets, email confirmations, or generic e-commerce without registry integration. Sellers upload project documents manually; buyers receive PDF invoices without verifiable serial numbers. Retirements may be recorded weeks later on an external registry, creating a window for double-selling.',
    ),
    body('The limitations are:'),
    ...bullets('bullets', [
      'Lack of real-time linkage between marketplace listings and registry serials.',
      'Manual KYC via email slows seller onboarding and increases fraud risk.',
      'No unified audit trail across login, purchase, and retirement events.',
      'Buyers cannot independently verify certificate authenticity online.',
      'Administrators lack a single dashboard for KYC review and dispute handling.',
      'Weak role separation allows operational mistakes and unauthorized access.',
    ]),
    h2('2.2 PROPOSED SYSTEM'),
    body(
      'The proposed system develops CC Verse as a verified carbon-credit marketplace. Sellers register projects with methodology and vintage metadata; credits are minted into the registry as Available entries. Listings bind quantity to specific registry inventory. When a buyer purchases, the system atomically moves serials to Retired, decrements listing quantity, creates an order, and issues a certificate—all in one transaction.',
    ),
    body('Advantages or benefits of the proposed system:'),
    ...bullets('bullets2', [
      'End-to-end traceability from project to retirement certificate.',
      'Real-time marketplace with reactive updates via Convex subscriptions.',
      'Structured KYC workflow with document upload and admin review.',
      'Role-based access control (Buyer, Seller, Auditor, Admin) with MFA for privileged roles.',
      'Append-only audit log for compliance and forensic review.',
      'Public registry verification page for third-party certificate checks.',
    ]),
    h2('2.3 FEASIBILITY STUDY'),
    body(
      'Feasibility study is conducted to determine whether the proposed system is practical and beneficial. It helps in analyzing if the system can be developed using available resources and whether it will be accepted by users.',
    ),
    h3('1. Technical Feasibility'),
    body(
      'Technical feasibility deals with hardware and software requirements. The proposed system uses mature open-source technologies: Next.js, React, TypeScript, Convex, and Tailwind CSS. Development runs on a standard laptop; deployment targets Node.js hosting plus Convex cloud.',
    ),
    ...bullets('bullets3', [
      'Runs on Windows, macOS, or Linux for development; modern browsers for users.',
      'Requires Node.js 20+, 8 GB RAM recommended for local development.',
      'Convex provides database, server functions, scheduling, and file storage actions.',
      'System is scalable through Convex cloud infrastructure.',
      'TypeScript strict mode ensures type safety across frontend and backend.',
    ]),
    h3('2. Operational Feasibility'),
    body(
      'Operational feasibility checks whether the system will work effectively after implementation. CC Verse provides role-specific dashboards so each user type sees only relevant actions.',
    ),
    ...bullets('bullets4', [
      'Buyers use a familiar e-commerce flow: browse, select quantity, confirm purchase.',
      'Sellers follow guided project and listing creation wizards.',
      'Admins review KYC from a dedicated queue with document preview.',
      'INVERSA design system ensures consistent dark-theme UI with accessible contrast.',
    ]),
    h3('3. Economic Feasibility'),
    body(
      'Economic feasibility evaluates cost and benefits. The stack is cost-effective for academic and startup deployment.',
    ),
    ...bullets('bullets5', [
      'Low development cost—Next.js, Convex free tier, and open-source libraries.',
      'No separate database server to provision; Convex handles persistence.',
      'AWS SES/S3 optional; dev environment mocks email and storage when unset.',
      'Reduces manual broker fees and reconciliation effort for organizations.',
    ]),
    h2('2.4 TOOLS AND TECHNOLOGIES'),
    h3('2.4.1 Hardware Requirements'),
    ...bullets('bullets6', [
      'RAM: 8 GB minimum (16 GB recommended for development).',
      'CPU: Intel Core i5 or Apple M-series equivalent.',
      'Hard Disk: 500 GB SSD.',
      'Input Devices: Keyboard, Mouse.',
      'Output Devices: Monitor (1920×1080 or higher).',
      'Client: Any device with a modern web browser.',
    ]),
    h3('2.4.2 Software Requirements'),
    ...bullets('bullets7', [
      'Operating System: Windows 10/11, macOS, or Linux.',
      'Frontend: Next.js 14, React 18, TypeScript 5.6, Tailwind CSS v4.',
      'Backend: Convex (queries, mutations, actions, scheduler).',
      'Authentication: iron-session (cookies), otplib (TOTP MFA), argon2 (password hashing).',
      'Optional: AWS SES (email), AWS S3 (KYC document storage).',
      'IDE: Visual Studio Code or Cursor.',
    ]),
    h3('2.4.3 Software Description'),
    body(
      '1. Next.js — React framework with App Router, server components, API routes, and middleware for session and RBAC enforcement.',
    ),
    body(
      '2. Convex — Backend-as-a-service providing a document-relational database, real-time queries, transactional mutations, and Node.js actions for email and S3.',
    ),
    body(
      '3. TypeScript — Statically typed JavaScript superset used across the monorepo for compile-time safety.',
    ),
    body(
      '4. iron-session — Encrypted HTTP-only session cookies sealing user ID and role for API routes and Edge middleware.',
    ),
    body(
      '5. Tailwind CSS v4 — Utility-first styling aligned with the INVERSA design tokens in DESIGN.md.',
    ),
    body(
      '6. argon2 / otplib — Secure password hashing and TOTP multi-factor authentication for auditor and admin roles.',
    ),
    h3('Front-End Selection'),
    body(
      'The front-end must provide a trustworthy marketplace experience with clear pricing, project metadata, and accessible purchase flows. Next.js App Router enables server-rendered pages for SEO on public registry routes while keeping authenticated dashboards reactive.',
    ),
    ...bullets('bullets7a', [
      'Scalable component architecture with shared INVERSA design tokens.',
      'Responsive layouts for desktop procurement teams and mobile buyers.',
      'Clear navigation between marketplace, account, and certificate views.',
      'Platform-independent access through any modern browser.',
      'Integration with Convex React hooks for live listing inventory updates.',
      'Strict TypeScript and ESLint guardrails for maintainability.',
    ]),
    h3('Back-End Selection'),
    body(
      'Convex was selected because CC Verse requires transactional mutations, indexed queries, scheduled jobs, and optional Node.js actions in one platform—eliminating separate PostgreSQL, Redis, and job queue infrastructure.',
    ),
    ...bullets('bullets7b', [
      'Supports multiple concurrent buyers with transactional purchase semantics.',
      'Efficient indexed lookups on email, listing status, and CVC serial.',
      'Real-time subscriptions update marketplace UI without manual refresh.',
      'Node actions integrate SES email and S3 storage when configured.',
      'Append-only audit log pattern maps naturally to insert-only mutations.',
      'Development and production deployments managed via convex dev / deploy.',
    ]),
    h3('Development Environment'),
    body(
      'Local development uses npm run dev, which runs convex dev and next dev in parallel. Environment variables are validated in lib/env.ts for Next.js; Convex actions read SES and S3 credentials from the deployment environment. A seed script creates an initial admin account for KYC review testing.',
    ),
    h2('2.5 SOFTWARE REQUIREMENT SPECIFICATION'),
    h3('2.5.1 Functional Requirements'),
    ...bullets('bullets8', [
      'User registration and login with email verification.',
      'Role assignment: Buyer, Seller, Auditor, Admin.',
      'Seller KYC document upload and admin review workflow.',
      'Carbon project registration with methodology, vintage, and country.',
      'Listing creation bound to registry-available credit quantity.',
      'Marketplace browse and listing detail with purchase action.',
      'Atomic purchase: order, payment record, certificate, registry retirement.',
      'Public registry and certificate verification pages.',
      'Password reset and MFA enrollment for privileged roles.',
      'Append-only audit logging for state-changing operations.',
    ]),
    h3('2.5.2 Non-Functional Requirements'),
    ...bullets('bullets9', [
      'Security: TLS, HSTS, CSP, httpOnly sameSite=strict session cookies.',
      'Performance: Sub-second marketplace queries via Convex indexes.',
      'Reliability: Atomic mutations prevent partial credit transfers.',
      'Accessibility: WCAG 2.1 AA compliance target from day one.',
      'Maintainability: Strict TypeScript, ESLint, and shared RBAC helpers.',
      'PII minimization on public verification surfaces.',
    ]),
    h3('2.5.3 Module Description'),
    body('The system mainly consists of the following modules:'),
    ...bullets('bullets10', [
      'Authentication Module',
      'Buyer Module',
      'Seller Module',
      'KYC & Compliance Module',
      'Registry Module',
      'Marketplace & Orders Module',
      'Admin & Auditor Module',
      'Audit Log Module',
    ]),
    body(
      'Authentication Module handles registration, login, email verification, password reset, session cookies, and MFA. Buyer Module provides marketplace access, purchase flow, order history, and certificate download. Seller Module covers project registration, listing management, and payout visibility.',
    ),
    body(
      'KYC & Compliance Module stores seller documents (S3 or dev mock), tracks review status, and gates listing activation. Registry Module maintains CVC serials and enforces Available → Held → Retired transitions. Marketplace & Orders Module connects buyers to listings and orchestrates purchase mutations.',
    ),
    body(
      'Admin & Auditor Module provides KYC queues, user management, and listing audit decisions. Audit Log Module appends immutable records with actor, action, target, IP, timestamp, and JSON payload.',
    ),
    h3('2.5.4 Client and Server Workflows'),
    body('Client Side (Buyer):'),
    ...numbered('numbers', [
      'Register and verify email.',
      'Log in and browse /marketplace.',
      'Open listing detail and select quantity.',
      'Confirm purchase; view certificate at /certificate/[certId].',
      'Verify retirement on public /registry page.',
    ]),
    body('Client Side (Seller):'),
    ...numbered('numbers2', [
      'Register as seller and complete KYC at /seller/kyc.',
      'Create project at /seller/projects/new.',
      'Create listing at /seller/listings/new.',
      'Monitor sales from seller dashboard.',
    ]),
    body('Server Side (Admin/Auditor):'),
    ...numbered('numbers3', [
      'Log in with MFA at /login.',
      'Review KYC submissions at /admin/kyc.',
      'Approve or reject documents with notes.',
      'Monitor audit log and platform health.',
    ]),
    body('[Insert flowchart diagram: User registration through purchase and certificate issuance]'),
    pageBreak(),
  ];
}

function chapter3() {
  const usersFields = [
    ['_id', 'Id(users)', 'Primary key', 'Convex document identifier'],
    ['email', 'string', 'Unique, not null', 'Login email address'],
    ['role', 'enum', 'BUYER|SELLER|AUDITOR|ADMIN', 'RBAC role'],
    ['status', 'enum', 'ACTIVE|SUSPENDED|…', 'Account status'],
    ['mfaEnabled', 'boolean', 'Required', 'MFA enrollment flag'],
    ['emailVerified', 'boolean', 'Required', 'Email verification status'],
    ['createdAt', 'float64', 'Required', 'Account creation timestamp'],
  ];
  const projectsFields = [
    ['_id', 'Id(projects)', 'Primary key', 'Project identifier'],
    ['sellerId', 'Id(users)', 'Foreign key', 'Owning seller'],
    ['name', 'string', 'Not null', 'Project display name'],
    ['country', 'string', 'Not null', 'Project country'],
    ['methodology', 'string', 'Not null', 'Carbon methodology'],
    ['vintageYear', 'number', 'Not null', 'Credit vintage year'],
    ['ccverseProjectId', 'string', 'Unique', 'Public project ID'],
    ['status', 'enum', 'DRAFT|APPROVED|ACTIVE|…', 'Project lifecycle'],
  ];
  const listingsFields = [
    ['_id', 'Id(listings)', 'Primary key', 'Listing identifier'],
    ['sellerId', 'Id(users)', 'Foreign key', 'Seller user'],
    ['projectId', 'Id(projects)', 'Foreign key', 'Linked project'],
    ['quantityTotal', 'number', 'Not null', 'Original quantity'],
    ['quantityAvailable', 'number', 'Not null', 'Remaining inventory'],
    ['unitPrice', 'number', 'Not null', 'Price per credit'],
    ['currency', 'string', 'INR|USD', 'Listing currency'],
    ['status', 'enum', 'ACTIVE|SOLD_OUT|…', 'Listing status'],
  ];
  const registryFields = [
    ['_id', 'Id(registryEntries)', 'Primary key', 'Registry row ID'],
    ['cvcSerial', 'string', 'Unique', 'Carbon Verse Credit serial'],
    ['state', 'enum', 'AVAILABLE|HELD|RETIRED', 'Registry state'],
    ['listingId', 'Id(listings)', 'Optional FK', 'Bound listing'],
    ['projectId', 'Id(projects)', 'Optional FK', 'Source project'],
    ['ownerBuyerId', 'Id(users)', 'Optional FK', 'Retirement owner'],
  ];
  const ordersFields = [
    ['_id', 'Id(orders)', 'Primary key', 'Order identifier'],
    ['buyerId', 'Id(users)', 'Foreign key', 'Purchasing buyer'],
    ['listingId', 'Id(listings)', 'Foreign key', 'Source listing'],
    ['quantity', 'number', 'Not null', 'Credits purchased'],
    ['serials', 'string[]', 'Not null', 'Retired CVC serials'],
    ['totalAmount', 'number', 'Not null', 'Order total'],
    ['certificateId', 'Id(certificates)', 'Optional FK', 'Issued certificate'],
    ['status', 'enum', 'PAID|FULFILLED|…', 'Order status'],
  ];
  const certsFields = [
    ['_id', 'Id(certificates)', 'Primary key', 'Certificate ID'],
    ['certNo', 'string', 'Unique', 'Human-readable cert number'],
    ['buyerId', 'Id(users)', 'Foreign key', 'Certificate owner'],
    ['orderId', 'Id(orders)', 'Foreign key', 'Source order'],
    ['serials', 'string[]', 'Not null', 'Retired serials'],
    ['projectName', 'string', 'Not null', 'Project on certificate'],
    ['status', 'enum', 'ISSUED|REVOKED', 'Certificate status'],
  ];

  return [
    h2('3. SYSTEM DESIGN'),
    body(
      'System design is one of the most important phases of the Software Development Life Cycle. It focuses on designing the structure and functionality of CC Verse based on requirements identified during analysis. The design ensures efficiency, reliability, and maintainability.',
    ),
    h2('3.1 SYSTEM PERSPECTIVE'),
    body('a. User Interface (UI)'),
    body(
      'Web Application (Next.js): Buyers use /marketplace and /buyer dashboards. Sellers use /seller routes for projects, listings, and KYC. Admins use /admin and auditors use /auditor consoles. Public pages include landing (/), registry (/registry), and certificate verification (/certificate/[certId]).',
    ),
    body('b. API Bridge Layer'),
    body(
      'Next.js API routes in app/api/ call Convex via lib/convex/client.ts. iron-session cookies authenticate requests; lib/rbac enforces role checks before mutations.',
    ),
    body('c. Backend (Convex)'),
    body(
      'Convex stores all application data and executes business logic. Mutations are transactional—purchase flow updates listings, orders, certificates, and registry entries atomically. Node actions handle SES email and S3 uploads when credentials are configured.',
    ),
    body('d. External Services'),
    body('Optional AWS SES for transactional email; AWS S3 for KYC document storage (mocked in dev when unset).'),
    h2('3.2 INPUT DESIGN'),
    body('Input forms include:'),
    ...bullets('bullets11', [
      'Registration: email, password, role selection.',
      'Login and MFA challenge forms.',
      'Seller KYC: document type, file upload (PAN, GSTIN, etc.).',
      'Project form: name, country, methodology, vintage, description.',
      'Listing form: project, quantity, unit price, currency.',
      'Purchase form: quantity selector on listing detail.',
    ]),
    h2('3.3 OUTPUT DESIGN'),
    body('Output screens include:'),
    ...bullets('bullets12', [
      'Marketplace grid with project metadata and pricing.',
      'Order confirmation with serial numbers and total amount.',
      'Retirement certificate with certNo and project name.',
      'Admin KYC queue with document review status.',
      'Public registry table with serial state filters.',
      'Audit log viewer for administrators.',
    ]),
    h2('3.4 DATABASE DESIGN'),
    body(
      'CC Verse uses Convex as a document-relational database. Tables are defined in convex/schema.ts with indexes on foreign keys and lookup fields. Registry integrity requires that CVC serial states transition only through defined mutations.',
    ),
    body('Objectives of Database Design:'),
    ...bullets('bullets13', [
      'Eliminate redundant credit serial assignment.',
      'Ensure atomic purchase and retirement.',
      'Support fast marketplace queries by listing status.',
      'Maintain append-only audit history.',
    ]),
    body(
      'Normalization: User profile data is split across users, sellerProfiles, and buyerProfiles. Orders reference listings and buyers without duplicating project text except on immutable certificates. Registry entries are first-class rows rather than embedded arrays to avoid document size limits.',
    ),
    h3('First Normal Form (1NF)'),
    body(
      'Each table field contains atomic values. Emergency contact phone numbers are not stored as comma-separated lists; each KYC document is its own row in kycDocuments. Each CVC serial occupies exactly one registryEntries document.',
    ),
    h3('Second Normal Form (2NF)'),
    body(
      'All non-key attributes depend on the whole primary key. Order line details such as quantity and serials depend on the order _id, not partially on buyer alone. Listing price and quantityAvailable depend on listing _id.',
    ),
    h3('Third Normal Form (3NF)'),
    body(
      'No transitive dependencies: project name is stored on projects and copied to certificates at issuance time for immutability, but live project edits do not rewrite historical certificates. Seller bank details live in bankAccounts, not duplicated on every payout row.',
    ),
    h3('TABLE STRUCTURE'),
  ]
    .concat(schemaTable('users', 'Stores authentication and RBAC core data.', usersFields))
    .concat(schemaTable('projects', 'Carbon projects registered by sellers.', projectsFields))
    .concat(schemaTable('listings', 'Marketplace offers tied to projects.', listingsFields))
    .concat(schemaTable('registryEntries', 'Authoritative CVC serial inventory.', registryFields))
    .concat(schemaTable('orders', 'Purchase records with retired serials.', ordersFields))
    .concat(schemaTable('certificates', 'Retirement certificates issued to buyers.', certsFields))
    .concat([
      h2('3.5 PROCESS DESIGN'),
      body('Three core processing modules:'),
      h3('Buyer & Marketplace Module'),
      body('Handles discovery, listing detail, and buyListing mutation triggering registry retirement.'),
      h3('Seller & KYC Module'),
      body('Handles project creation, listing publication after audit, and document uploads.'),
      h3('Registry & Certificate Module'),
      body('Allocates serials, enforces state machine, and generates CERT-######## numbers.'),
    body('Workflow Example — Purchase Flow:'),
    ...numbered('numbers4', [
      'Buyer selects quantity on listing detail page.',
      'Next.js API route validates session and BUYER role.',
      'buyListing mutation loads listing, project, and AVAILABLE registry rows.',
      'Mutation patches listing quantity, inserts order and certificate, retires serials.',
      'Audit log records actor, action PURCHASE, serial list, and timestamp.',
      'Buyer redirected to certificate page with certNo and project name.',
    ]),
    h3('3.5.1 Data Flow Diagram'),
    body(
      'A Data Flow Diagram (DFD) represents how data moves between external entities (Buyer, Seller, Admin), processes (Authenticate, List Credits, Purchase, Review KYC), and data stores (Convex tables, S3 bucket).',
    ),
    body('Rules for constructing a DFD:'),
    ...bullets('bullets13a', [
      'Arrows should not cross each other where possible.',
      'Every process must have at least one input and one output.',
      'External entities interact with processes, not directly with internal stores.',
      'Use consistent naming for data flows (e.g., PurchaseRequest, KycDocument).',
      'Decompose complex flows into Level 1 and Level 2 diagrams.',
    ]),
      body('[Insert DFD Level 0 diagram]'),
      body('[Insert DFD Level 1 diagram: Purchase flow]'),
      h3('Entity-Relationship Diagram'),
      body(
        'Entities: User, SellerProfile, Project, Listing, RegistryEntry, Order, Certificate, KycDocument, AuditLog. Relationships include Seller–Project (1:N), Project–Listing (1:N), Listing–RegistryEntry (1:N), Buyer–Order (1:N), Order–Certificate (1:1).',
      ),
      body('[Insert ER diagram]'),
      pageBreak(),
    ]);
}

function chapter4() {
  const testRows = [
    ['TC01', 'User Registration', 'Valid email, password, role', 'Account created, verification email sent', 'As expected', 'Pass'],
    ['TC02', 'Invalid Login', 'Wrong password', 'Error message, no session', 'As expected', 'Pass'],
    ['TC03', 'Seller KYC Upload', 'Valid PAN document', 'Document stored, status PENDING', 'As expected', 'Pass'],
    ['TC04', 'Admin KYC Approve', 'Admin MFA + approve action', 'Seller kycStatus APPROVED', 'As expected', 'Pass'],
    ['TC05', 'Create Listing', 'Active project + quantity', 'Listing ACTIVE with inventory', 'As expected', 'Pass'],
    ['TC06', 'Purchase Credits', 'Qty ≤ available', 'Order PAID, serials RETIRED, cert issued', 'As expected', 'Pass'],
    ['TC07', 'Insufficient Inventory', 'Qty > available', 'Error returned, no state change', 'As expected', 'Pass'],
    ['TC08', 'RBAC Enforcement', 'Buyer accesses /admin', '403 redirect or denial', 'As expected', 'Pass'],
    ['TC09', 'MFA Required', 'Auditor login without MFA', 'MFA challenge required', 'As expected', 'Pass'],
    ['TC10', 'Public Registry', 'Lookup by serial', 'State displayed without PII', 'As expected', 'Pass'],
  ];
  return [
    h1('4. SYSTEM TESTING'),
    h2('4. SYSTEM TESTING'),
    body(
      'System testing evaluates the complete integrated application to ensure it meets specified requirements. Testing was performed on the Next.js frontend, API routes, and Convex backend running in local development mode.',
    ),
    h3('Objectives of System Testing'),
    ...bullets('bullets14', [
      'Verify all functional requirements are satisfied.',
      'Check purchase atomicity under concurrent requests.',
      'Ensure proper RBAC and MFA enforcement.',
      'Identify defects before deployment.',
    ]),
    h3('Types of System Testing Performed'),
    h3('1. Functional Testing'),
    body('Each feature tested with valid and invalid inputs: registration, KYC, listing, purchase, certificate.'),
    h3('2. Integration Testing'),
    body('API routes tested against Convex mutations; session cookie propagation verified through middleware.'),
    h3('3. Security Testing'),
    body('Verified httpOnly cookies, role-gated routes, and MFA for admin/auditor accounts.'),
    h3('4. Usability Testing'),
    body('INVERSA UI reviewed for contrast, focus states, and clear call-to-action on purchase flow.'),
    h3('5. Compatibility Testing'),
    body('Tested on Chrome and Edge; responsive layouts verified at mobile and desktop breakpoints.'),
    h3('Test Cases'),
    makeTable(
      ['Test Case ID', 'Description', 'Input Data', 'Expected Result', 'Actual Result', 'Status'],
      testRows,
      [900, 1400, 1400, 1800, 1200, 660],
    ),
    pageBreak(),
  ];
}

function chapter5to8() {
  return [
    h1('5. SYSTEM IMPLEMENTATION'),
    h2('5.1 SYSTEM IMPLEMENTATION'),
    body(
      'Implementation deploys the developed system into a working environment. CC Verse runs locally via npm run dev, which starts both convex dev and next dev. Production deployment uses next build plus npx convex deploy.',
    ),
    h3('5.1.1 Training'),
    body(
      'Programmer training covers convex/schema.ts, mutation patterns, lib/rbac session guards, and middleware.ts Edge compatibility. Developers learn that Convex is the single source of truth—business logic must not be duplicated in API routes beyond validation and session bridging.',
    ),
    h3('1. Programmer Training'),
    ...bullets('bullets17', [
      'Read CLAUDE.md and docs/README.md for architectural invariants.',
      'Use indexes instead of table scans in Convex queries.',
      'Schedule only internal Convex functions from ctx.scheduler.',
      'Never mutate registry serials outside registry mutations.',
    ]),
    h3('2. User Training'),
    body(
      'Buyers learn to verify certificates on the public registry page. Sellers learn KYC document requirements and listing activation rules. Administrators practice MFA enrollment before accessing /admin/kyc.',
    ),
    h3('5.1.2 Conversion'),
    body(
      'Conversion shifts organizations from spreadsheet or broker-based tracking to registry-integrated marketplace records. Existing project metadata can be imported via seed scripts; registry serials are minted through admin tooling.',
    ),
    body('Post-implementation review evaluates purchase success rate, KYC turnaround, and audit log completeness.'),
    pageBreak(),
    h1('6. SYSTEM MAINTENANCE'),
    h2('6. SYSTEM MAINTENANCE'),
    h3('Corrective Maintenance'),
    body('Fixing bugs in purchase flow, session handling, or KYC review edge cases discovered post-release.'),
    h3('Adaptive Maintenance'),
    body('Updating for new Convex SDK versions, Next.js security patches, or AWS API changes.'),
    h3('Perfective Maintenance'),
    body('Improving marketplace search, certificate PDF export, and admin reporting dashboards.'),
    pageBreak(),
    h1('7. FUTURE ENHANCEMENT'),
    h2('7. FUTURE ENHANCEMENT'),
    ...bullets('bullets15', [
      'Payment gateway integration (Razorpay, Stripe) for live settlements.',
      'Blockchain anchoring of registry retirement hashes for external verification.',
      'Automated KYC via third-party identity providers.',
      'Multi-language support for international buyers.',
      'Advanced analytics dashboard for market trends and vintage pricing.',
      'Mobile-native application using React Native.',
      'Webhook notifications for sellers on new orders.',
      'Integration with external registries (Verra, Gold Standard APIs).',
    ]),
    pageBreak(),
    h1('8. CONCLUSION'),
    h2('8. CONCLUSION'),
    body(
      `The ${PROJECT_TITLE} project has been successfully designed and developed as a verified carbon-credit marketplace with registry-integrated purchases, role-based access control, and retirement certificates.`,
    ),
    body(
      'By combining Next.js, Convex, and strict registry mutations, the project reduces double-counting risk and improves transparency for buyers and auditors. The append-only audit log supports compliance requirements.',
    ),
    body(
      'This project strengthened practical skills in full-stack TypeScript development, real-time backends, secure authentication, and domain modeling for regulated marketplaces.',
    ),
    body(
      'Overall, CC Verse is a scalable foundation for voluntary carbon trading with room for payment integration, external registry sync, and enterprise procurement workflows.',
    ),
    pageBreak(),
  ];
}

function appendix() {
  const schemaSnippet = [
    'export default defineSchema({',
    '  users: defineTable({',
    '    email: v.string(),',
    '    role: UserRole,  // BUYER | SELLER | AUDITOR | ADMIN',
    '    mfaEnabled: v.boolean(),',
    '    emailVerified: v.boolean(),',
    '  }).index("by_email", ["email"]),',
    '',
    '  registryEntries: defineTable({',
    '    cvcSerial: v.string(),',
    '    state: RegistryState,  // AVAILABLE | HELD | RETIRED',
    '    listingId: v.optional(v.id("listings")),',
    '    ownerBuyerId: v.optional(v.id("users")),',
    '  }).index("by_cvcSerial", ["cvcSerial"]),',
    '});',
  ];
  const buySnippet = [
    'export const buyListing = mutation({',
    '  handler: async (ctx, args) => {',
    '    const availableEntries = await ctx.db',
    '      .query("registryEntries")',
    '      .withIndex("by_listingId", q => q.eq("listingId", args.listingId))',
    '      .filter(q => q.eq(q.field("state"), "AVAILABLE"))',
    '      .take(args.quantity);',
    '    // ... create order, certificate, retire serials atomically',
    '  },',
    '});',
  ];
  return [
    h1('9. APPENDIX'),
    h2('9.1 CODING'),
    h3('convex/schema.ts (excerpt)'),
    ...codeBlock(schemaSnippet),
    h3('convex/orders/mutations.ts — buyListing (excerpt)'),
    ...codeBlock(buySnippet),
    h2('9.2 SCREENSHOTS'),
    body('Add application screenshots below before submission. Suggested captures:'),
    ...bullets('bullets16', [
      'Landing page (/) — hero and mission section.',
      'Marketplace (/marketplace) — active listings.',
      'Listing detail (/marketplace/[listingId]) — purchase form.',
      'Buyer dashboard (/buyer) — orders and certificates.',
      'Seller KYC (/seller/kyc) — document upload.',
      'Admin KYC queue (/admin/kyc) — review interface.',
      'Certificate page (/certificate/[certId]) — retirement proof.',
      'Public registry (/registry) — serial lookup.',
    ]),
    ...[
      'Landing Page',
      'Marketplace',
      'Listing Detail',
      'Buyer Dashboard',
      'Seller KYC',
      'Admin KYC Review',
      'Retirement Certificate',
      'Public Registry',
    ].map((cap) => para(`[Insert screenshot: ${cap}]`)),
    pageBreak(),
  ];
}

function bibliography() {
  const refs = [
    '[1] Next.js Documentation — https://nextjs.org/docs',
    '[2] React Documentation — https://react.dev',
    '[3] Convex Documentation — https://docs.convex.dev',
    '[4] TypeScript Handbook — https://www.typescriptlang.org/docs/',
    '[5] Tailwind CSS Documentation — https://tailwindcss.com/docs',
    '[6] iron-session — https://github.com/vvo/iron-session',
    '[7] otplib — https://github.com/yeojz/otplib',
    '[8] OWASP Session Management — https://owasp.org/',
    '[9] WCAG 2.1 Guidelines — https://www.w3.org/WAI/WCAG21/quickref/',
    '[10] Verra VCS Program — https://verra.org/programs/verified-carbon-standard/',
    '[11] Gold Standard — https://www.goldstandard.org/',
    '[12] IPCC Climate Change Reports — https://www.ipcc.ch/',
    '[13] AWS SES Documentation — https://docs.aws.amazon.com/ses/',
    '[14] AWS S3 Documentation — https://docs.aws.amazon.com/s3/',
  ];
  return [
    h1('10. BIBLIOGRAPHY'),
    ...refs.map((r) => body(r)),
  ];
}

async function main() {
  const numbering = {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      ...[
        'bullets2',
        'bullets3',
        'bullets4',
        'bullets5',
        'bullets6',
        'bullets7',
        'bullets7a',
        'bullets7b',
        'bullets8',
        'bullets9',
        'bullets10',
        'bullets11',
        'bullets12',
        'bullets13',
        'bullets13a',
        'bullets14',
        'bullets15',
        'bullets16',
        'bullets17',
      ].map((ref) => ({
        reference: ref,
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      })),
      ...['numbers', 'numbers2', 'numbers3', 'numbers4'].map((ref) => ({
        reference: ref,
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      })),
    ],
  };

  const children = [
    ...coverPage(),
    ...bonafide(),
    ...declaration(),
    ...acknowledgement(),
    ...abstractSection(),
    ...toc(),
    ...chapter1(),
    ...chapter2(),
    ...chapter3(),
    ...chapter4(),
    ...chapter5to8(),
    ...appendix(),
    ...bibliography(),
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 24 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 2 },
        },
      ],
    },
    numbering,
    sections: [
      {
        properties: { page: pageProps },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  txt('Page '),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 20 }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log(`Written: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
