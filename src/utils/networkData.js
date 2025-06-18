export const nodes = Array.from({ length: 100 }, (_, i) => ({ index: i }));

// Function to generate unique links
function generateUniqueLinks(numLinks, numNodes) {
  const generatedLinks = new Set();
  const links = [];
  const nodeConnected = new Set();

  // Step 1: Ensure each node has at least one connection
  for (let node = 0; node < numNodes; node++) {
    let target;
    do {
      target = Math.floor(Math.random() * numNodes);
    } while (
      target === node ||                                 // prevent self-loop
      (node < 10 && target < 10)                         // skip 0–9 only links
    );

    const key = `${Math.min(node, target)}-${Math.max(node, target)}`;
    if (!generatedLinks.has(key)) {
      generatedLinks.add(key);
      links.push({ source: node, target });
      nodeConnected.add(node);
      nodeConnected.add(target);
    }
  }

  // Step 2: Add random unique links until numLinks is reached
  while (links.length < numLinks) {
    let source = Math.floor(Math.random() * numNodes);
    let target = Math.floor(Math.random() * numNodes);

    if (source === target) continue;
    if (source < 10 && target < 10) continue;

    const key = `${Math.min(source, target)}-${Math.max(source, target)}`;
    if (!generatedLinks.has(key)) {
      generatedLinks.add(key);
      links.push({ source, target });
      nodeConnected.add(source);
      nodeConnected.add(target);
    }
  }

  return links;
}

export const links = generateUniqueLinks(300, 100);