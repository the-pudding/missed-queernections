export const nodes = Array.from({ length: 100 }, (_, i) => ({ index: i }));

// Function to generate unique links
function generateUniqueLinks(numLinks, numNodes) {
  const generatedLinks = new Set(); // Use a Set to track unique link keys
  const links = [];

  while (links.length < numLinks) {
    let source = Math.floor(Math.random() * numNodes);
    let target = Math.floor(Math.random() * numNodes);

    // Optional: Prevent self-loops (link from a node to itself)
    if (source === target) {
      continue; // Skip this iteration and generate a new link
    }

    // Normalize the key to handle bidirectional links (e.g., 30-78 is same as 78-30)
    // Always put the smaller index first
    const key = `${Math.min(source, target)}-${Math.max(source, target)}`;

    if (!generatedLinks.has(key)) {
      generatedLinks.add(key);
      links.push({ source: source, target: target }); // Add the link with original source/target
    }
  }
  return links;
}

export const links = generateUniqueLinks(300, 100);