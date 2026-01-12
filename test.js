import { generateMarkdown, saveMarkdown, convertToPdf } from './generator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Sample analyzed data (what Claude would return)
const sampleData = {
  client_name: "Sunrise Bakery",
  project_total: 8500,
  project_summary: `Sunrise Bakery is a family-owned artisan bakery looking to establish a strong online presence to showcase their handcrafted breads, pastries, and custom cakes. They want to attract new customers, enable online ordering for pickup, and share their story of three generations of baking tradition.

The website will serve as both a digital storefront and a brand experience, highlighting the craftsmanship and quality ingredients that set Sunrise Bakery apart from commercial competitors. The goal is to increase foot traffic by 30% and enable online pre-orders to reduce wait times during peak hours.`,
  deliverables: [
    {
      name: "Homepage Design",
      description: "A visually stunning homepage featuring hero imagery of fresh-baked goods, daily specials, store hours, and clear calls-to-action for online ordering and location information."
    },
    {
      name: "Product Catalog",
      description: "Organized product pages for Breads, Pastries, Cakes, and Seasonal Specials with high-quality photography, descriptions, pricing, and allergen information."
    },
    {
      name: "Online Ordering System",
      description: "Integration with Square for pickup orders, allowing customers to browse the menu, select items, choose pickup times, and pay online."
    },
    {
      name: "About Page",
      description: "Storytelling page featuring the bakery's history, family photos, and commitment to traditional baking methods."
    },
    {
      name: "Contact & Location",
      description: "Contact form, embedded Google Maps, store hours, and parking information."
    }
  ],
  timeline: [
    { phase: "Discovery & Planning", duration: "1 week", description: "Gather brand assets, finalize requirements, review competitor sites" },
    { phase: "Design", duration: "2 weeks", description: "Wireframes, visual design, client review and revisions" },
    { phase: "Development", duration: "3 weeks", description: "Build responsive website, integrate Square, set up CMS" },
    { phase: "Content & Testing", duration: "1 week", description: "Add products, test ordering flow, cross-browser testing" },
    { phase: "Launch", duration: "1 week", description: "Final review, DNS setup, go-live, post-launch support" }
  ],
  client_needs: [
    "High-resolution product photography (or budget for photo shoot)",
    "Final logo files in vector format (AI, EPS, or SVG)",
    "Brand colors and any existing style guidelines",
    "Complete product list with descriptions and pricing",
    "Allergen information for all products",
    "Story content and family photos for About page",
    "Square account credentials for ordering integration"
  ],
  technical_requirements: {
    cms: "WordPress with WooCommerce",
    integrations: ["Square POS", "Google Maps", "Instagram Feed", "Mailchimp"],
    features: ["Mobile-responsive design", "Online ordering with pickup scheduling", "Product filtering by category", "SEO optimization", "SSL certificate"]
  },
  payment_milestones: [
    { milestone: "Upon agreement", percentage: 30 },
    { milestone: "Upon design approval", percentage: 40 },
    { milestone: "Upon project completion", percentage: 30 }
  ]
};

const settings = {
  businessName: "Mason Price Design",
  businessEmail: "mason@example.com",
  businessPhone: "(555) 123-4567"
};

async function runTest() {
  console.log("\n=== Testing Proposal Generator ===\n");

  // Generate markdown
  console.log("1. Generating markdown...");
  const markdown = generateMarkdown(sampleData, settings);
  const mdPath = path.join(outputDir, "test-proposal.md");
  saveMarkdown(markdown, mdPath);
  console.log(`   Saved: ${mdPath}`);

  // Generate PDF
  console.log("\n2. Converting to PDF...");
  const pdfPath = path.join(outputDir, "test-proposal.pdf");
  await convertToPdf(mdPath, pdfPath);
  console.log(`   Saved: ${pdfPath}`);

  // Open PDF
  console.log("\n3. Opening PDF...");
  const { exec } = await import('child_process');
  exec(`open "${pdfPath}"`);

  console.log("\n=== Test Complete ===\n");
}

runTest().catch(console.error);
