import {
  Queue,
  Stack,
  MinPriorityQueue,
  SinglyLinkedList,
  DoublyLinkedList,
  BinarySearchTree,
  RedBlackTree,
  Graph,
  HashMap,
  DynamicArray,
  quickSort,
  mergeSort,
} from "../src/lib/dsa/index";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok  - " + msg);
}

// Queue FIFO
const q = new Queue<number>();
[1, 2, 3].forEach((n) => q.enqueue(n));
assert(q.dequeue() === 1 && q.peek() === 2 && q.size === 2, "Queue FIFO");

// Stack LIFO
const s = new Stack<number>();
[1, 2, 3].forEach((n) => s.push(n));
assert(s.pop() === 3 && s.peek() === 2, "Stack LIFO");

// Priority queue (min)
const pq = new MinPriorityQueue<string>();
pq.enqueue("routine", 5);
pq.enqueue("critical", 1);
pq.enqueue("urgent", 3);
assert(pq.dequeue() === "critical" && pq.dequeue() === "urgent", "PriorityQueue triage");

// Singly linked list
const sll = new SinglyLinkedList<number>();
[10, 20, 30].forEach((n) => sll.append(n));
assert(sll.find((v) => v === 20) === 20 && sll.size === 3, "SinglyLinkedList find");
sll.remove((v) => v === 20);
assert(sll.size === 2 && sll.find((v) => v === 20) === undefined, "SinglyLinkedList remove");

// Doubly linked list bidirectional cursor
const dll = new DoublyLinkedList<string>();
["registered", "saw-doctor", "operated"].forEach((e) => dll.append(e));
assert(dll.current() === "operated", "DLL cursor at end");
assert(dll.back() === "saw-doctor" && dll.back() === "registered", "DLL back");
assert(dll.forward() === "saw-doctor", "DLL forward");

// BST
const bst = new BinarySearchTree<string>();
[[5, "e"], [3, "c"], [8, "h"], [1, "a"]].forEach(([k, v]) => bst.insert(k as number, v as string));
assert(bst.search(8) === "h" && bst.search(99) === undefined, "BST search");
assert(bst.inOrder().map((x) => x.key).join(",") === "1,3,5,8", "BST inorder sorted");

// Red-Black tree: insert 1..1000 in sorted order; height must stay ~log2 n, not n
const rb = new RedBlackTree<number>();
for (let i = 1; i <= 1000; i++) rb.insert(i, i);
assert(rb.search(777) === 777 && rb.search(0) === undefined, "RBTree search");
assert(rb.inOrder().length === 1000, "RBTree size after sorted insert");
const h = rb.height();
assert(h <= 2 * Math.log2(1000 + 1), `RBTree stays balanced (height=${h} <= ${(2 * Math.log2(1001)).toFixed(1)})`);
assert(rb.range(100, 110).length === 11, "RBTree range query");

// Graph symptom -> specialist routing
const g = new Graph(true);
g.addEdge("chest pain", "Cardiology", 1);
g.addEdge("Cardiology", "Dr. Khan", 2);
g.addEdge("chest pain", "ER", 1);
g.addEdge("ER", "Dr. Ali", 5);
const sp = g.shortestPath("chest pain", "Dr. Khan");
assert(sp !== null && sp.path.join(" -> ") === "chest pain -> Cardiology -> Dr. Khan", "Graph shortest path");

// Hash map
const hm = new HashMap<string>();
for (let i = 0; i < 50; i++) hm.set("patient-" + i, "name-" + i);
assert(hm.get("patient-42") === "name-42" && hm.size === 50, "HashMap set/get with resize");

// Dynamic array + binary search
const da = new DynamicArray<{ id: number }>();
for (let i = 1; i <= 20; i++) da.push({ id: i });
assert(da.size === 20 && da.get(0)!.id === 1, "DynamicArray push/grow");
assert(da.binarySearch(15, (v) => v.id) === 14, "DynamicArray binary search");

// Sorting
const nums = [5, 3, 9, 1, 7, 2];
const asc = (a: number, b: number) => a - b;
assert(quickSort(nums, asc).sorted.join(",") === "1,2,3,5,7,9", "quickSort");
assert(mergeSort(nums, asc).sorted.join(",") === "1,2,3,5,7,9", "mergeSort");

console.log("\nALL DSA SMOKE TESTS PASSED ✅");
