# Data Structures & Algorithms in MediStruct

This document explains **every data structure and algorithm** used in the
project: *where* it is used in the hospital workflow, *how* it is implemented,
its **pseudocode**, and its **time/space complexity**.

All structures are **hand-written from scratch** in
[`src/lib/dsa/`](src/lib/dsa) — no third-party data-structure libraries are
used. Each file also exports a `complexity` descriptor that is rendered live on
the **DSA Gallery** page (`/dsa`).

## The two-layer design

The app deliberately keeps two layers so the data structures do real work
instead of being decoration:

| Layer | Role |
|-------|------|
| **PostgreSQL (Neon)** | Permanent storage — the source of truth (patients, bills, appointments…). |
| **Hand-written DSA layer** (`src/lib/dsa`) | The in-memory *working layer*: rows loaded from Postgres are fed through our own Queue / Graph / Linked-List / Sort to drive a feature. |

So a request typically does: **read rows from Postgres → build a data structure
→ run its algorithm → render the result.**

## Where each structure is used

| Structure | File | Used by | Wired into a live workflow? |
|-----------|------|---------|------------------------------|
| Queue (FIFO) | `queue.ts` | `reception/queue` | **Yes** — reception waiting line |
| Graph + Dijkstra/BFS | `graph.ts` | `lib/routing.ts` (New Patient) | **Yes** — symptom→specialist routing |
| Singly Linked List | `linked-list.ts` | `doctor/.../clinical-console` | **Yes** — chronological note log |
| Doubly Linked List | `doubly-linked-list.ts` | `components/timeline-viewer` | **Yes** — patient timeline |
| Sorting (5 algorithms) | `sorting.ts` | `lib/routing.ts`, `/dsa` demo | **Yes** — rank doctors; live sort-race |
| Min Priority Queue (heap) | `priority-queue.ts` | `doctor/queue`, `/dsa` triage demo | **Yes** — emergency triage (doctor's queue) |
| Stack (LIFO) | `stack.ts` | DSA Gallery | Implemented + gallery (undo/history model) |
| Binary Search Tree | `bst.ts` | DSA Gallery | Implemented + gallery (ID lookup) |
| Red-Black Tree | `red-black-tree.ts` | DSA Gallery | Implemented + gallery (date index) |
| Hash Map | `hash-map.ts` | DSA Gallery | Implemented + gallery (O(1) lookup) |
| Dynamic Array | `dynamic-array.ts` | DSA Gallery | Implemented + gallery (bill items) |

Everything is unit-tested in `scripts/dsa-smoke.mts` (`npm run dsa:test`).

---

# 1. Queue (FIFO)

**File:** `src/lib/dsa/queue.ts`
**Used in:** `src/app/(app)/reception/queue/page.tsx` (the reception waiting line).

### Where & why
A patient who walks in is *enqueued*; whoever has waited longest is served
first. This is textbook **first-come, first-served**, so a FIFO queue is the
natural fit. The reception queue page loads all waiting patients from Postgres
(ordered by arrival time), pushes them through our `Queue`, and renders the
front of the line as "serve next".

> The **doctor's** queue is *not* FIFO — a critical patient must be able to jump
> ahead of a routine one. That queue is a **Min Priority Queue** keyed on triage
> severity; see §3 below.

### How it is implemented
A **singly linked chain of nodes** with `head` and `tail` pointers. Using a
tail pointer makes *both* enqueue and dequeue **O(1)** — no array shifting.

### Pseudocode
```
class Queue:
    head ← null          # front of the line
    tail ← null          # back of the line
    size ← 0

    function enqueue(value):          # add to the back
        node ← Node(value)
        if tail exists:
            tail.next ← node
        else:                          # queue was empty
            head ← node
        tail ← node
        size ← size + 1

    function dequeue():                # remove from the front
        if head is null: return EMPTY
        value ← head.value
        head ← head.next
        if head is null: tail ← null   # queue became empty
        size ← size - 1
        return value
```

### Complexity
| Operation | Time | Space |
|-----------|------|-------|
| enqueue / dequeue / peek | **O(1)** | O(n) total |

---

# 2. Stack (LIFO)

**File:** `src/lib/dsa/stack.ts`
**Used in:** DSA Gallery (models the **undo / action-history** pattern).

### Where & why
Whenever a receptionist changes a status (e.g. marks a bill *paid*), the
previous state can be **pushed** onto a stack; an "undo" **pops** the most
recent change. Last-in-first-out is exactly what "undo the last thing" needs.

### How it is implemented
A plain array where the **last element is the top**, giving O(1) push/pop.

### Pseudocode
```
class Stack:
    items ← [ ]

    function push(value):  append value to end of items      # O(1)
    function pop():        return and remove last of items    # O(1)
    function peek():       return last of items without removing
```

### Complexity
| Operation | Time |
|-----------|------|
| push / pop / peek | **O(1)** amortized |

---

# 3. Min Priority Queue (Binary Heap)

**File:** `src/lib/dsa/priority-queue.ts`
**Used in:** the doctor's **live queue** (`src/app/(app)/doctor/queue/page.tsx`)
and the **Emergency Triage** demo on `/dsa` (`live-demos.tsx`).

### Where & why
A plain FIFO queue cannot let a *critical* patient jump ahead of a *routine*
one. When a receptionist registers a patient they set a **triage severity**
(1 = critical … 5 = routine), stored on the patient row. The doctor's queue
loads all waiting patients and feeds them through this **min-heap**, so the most
urgent patient is always dequeued next in **O(log n)**, regardless of arrival
order.

**Fair tie-breaking (FIFO within a severity).** Two patients with the *same*
severity should be seen in arrival order. The queue page enqueues each patient
with a **composite priority**:

```
priority = severity × 1_000_000 + arrivalIndex
```

Since `arrivalIndex` is always `< 1_000_000`, severity dominates the ordering and
arrival time only breaks ties — so a severity-3 patient is always seen before a
severity-5 patient, and among equal severities the one who has waited longest
goes first.

### How it is implemented
A **binary min-heap stored in an array**. For the node at index `i`:
- parent is at `(i-1)/2`
- children are at `2i+1` and `2i+2`

`enqueue` appends then **bubbles up**; `dequeue` swaps root with the last
element, removes it, then **bubbles down**.

### Pseudocode
```
class MinPriorityQueue:
    heap ← [ ]           # array of {value, priority}

    function enqueue(value, priority):
        heap.append({value, priority})
        bubbleUp(lastIndex)

    function dequeue():                       # remove smallest priority
        if heap empty: return EMPTY
        top ← heap[0]
        heap[0] ← heap.pop()                  # move last to root
        bubbleDown(0)
        return top.value

    function bubbleUp(i):
        while i > 0 and heap[i].priority < heap[parent(i)].priority:
            swap(i, parent(i));  i ← parent(i)

    function bubbleDown(i):
        loop:
            smallest ← i
            if left(i)  has smaller priority: smallest ← left(i)
            if right(i) has smaller priority: smallest ← right(i)
            if smallest = i: break
            swap(i, smallest);  i ← smallest
```

### Complexity
| Operation | Time | Why |
|-----------|------|-----|
| enqueue | **O(log n)** | bubble up the tree height |
| dequeue | **O(log n)** | bubble down the tree height |
| peek | **O(1)** | root is always the minimum |

---

# 4. Singly Linked List

**File:** `src/lib/dsa/linked-list.ts`
**Used in:** `doctor/patients/[id]/clinical-console.tsx` — the doctor's
**note log** for a patient.

### Where & why
Notes are written over time and read back **in order**. We load the notes from
Postgres, `append` each into a singly linked list, then read `head → tail`. It
demonstrates O(1) append and O(n) sequential traversal.

### How it is implemented
Nodes each hold a `value` and a `next` pointer. `head`/`tail` pointers make
append O(1).

### Pseudocode
```
class SinglyLinkedList:
    head ← null ; tail ← null ; size ← 0

    function append(value):               # O(1)
        node ← Node(value)
        if tail exists: tail.next ← node else head ← node
        tail ← node ; size ← size + 1

    function find(predicate):             # O(n) linear scan
        cur ← head
        while cur ≠ null:
            if predicate(cur.value): return cur.value
            cur ← cur.next
        return NOT_FOUND
```

### Complexity
| Operation | Time |
|-----------|------|
| append / prepend | **O(1)** |
| find / remove | **O(n)** |

---

# 5. Doubly Linked List

**File:** `src/lib/dsa/doubly-linked-list.ts`
**Used in:** `src/components/timeline-viewer.tsx` — the **patient timeline**.

### Where & why
The patient history (registered → saw doctor → lab → operation → discharged)
must be walked **both directions**: the UI has *Prev* / *Next* buttons. Each
node keeps a `prev` **and** a `next` pointer plus a `cursor`, so stepping
backward or forward is **O(1)** — precisely what a doubly linked list is for.

### How it is implemented
Nodes hold `prev`, `next`, `value`. A `cursor` points at the currently shown
event; `back()`/`forward()` just follow the pointers.

### Pseudocode
```
class DoublyLinkedList:
    head ← null ; tail ← null ; cursor ← null ; size ← 0

    function append(value):                 # O(1)
        node ← Node(value)
        node.prev ← tail
        if tail exists: tail.next ← node else head ← node
        tail ← node ; cursor ← node ; size ← size + 1

    function back():                        # O(1)
        if cursor.prev exists: cursor ← cursor.prev
        return cursor.value

    function forward():                     # O(1)
        if cursor.next exists: cursor ← cursor.next
        return cursor.value
```

### Complexity
| Operation | Time |
|-----------|------|
| append / back / forward | **O(1)** |
| toArray (render) | **O(n)** |

---

# 6. Binary Search Tree (BST)

**File:** `src/lib/dsa/bst.ts`
**Used in:** DSA Gallery — models **patient lookup by auto-generated ID**.

### Where & why
Patient IDs are integers. A BST keeps them ordered so a lookup is **O(log n)**
on average versus **O(n)** for scanning a list. (Its weakness — degrading to
O(n) when keys arrive already sorted — is exactly why the Red-Black tree below
exists.)

### How it is implemented
Each node has a `key`, `value`, `left`, `right`. Search/insert walk left when
the target is smaller, right when larger.

### Pseudocode
```
function insert(key, value):
    if root is null: root ← Node(key, value); return
    cur ← root
    loop:
        if key = cur.key:  cur.value ← value; return       # update
        if key < cur.key:
            if cur.left is null: cur.left ← Node(key,value); return
            cur ← cur.left
        else:
            if cur.right is null: cur.right ← Node(key,value); return
            cur ← cur.right

function search(key):
    cur ← root
    while cur ≠ null:
        if key = cur.key: return cur.value
        cur ← (key < cur.key) ? cur.left : cur.right
    return NOT_FOUND

function inOrder():          # yields keys in ASCENDING order
    walk(left) ; visit(node) ; walk(right)
```

### Complexity
| Operation | Time |
|-----------|------|
| search / insert | **O(log n)** average, O(n) worst |
| inOrder traversal | **O(n)** |

---

# 7. Red-Black Tree (self-balancing BST)

**File:** `src/lib/dsa/red-black-tree.ts`
**Used in:** DSA Gallery — models the **appointment index keyed by date**.

### Where & why
Appointments are booked in roughly increasing date order, which would make a
plain BST degenerate into a linked list (O(n)). A **Red-Black tree** re-colours
and rotates on insert so the height stays **O(log n)** in the *worst* case,
keeping "today's schedule" and date-range lookups fast. Verified in the tests:
inserting 1..1000 in sorted order gives height **17** (a plain BST would be
1000).

### The five invariants
1. Every node is **red** or **black**.
2. The root is **black**.
3. All leaves (the shared **NIL** sentinel) are **black**.
4. A red node cannot have a red child.
5. Every root→leaf path has the **same number of black nodes**.

Insert colours the new node **red**, then `insertFixup` restores the
invariants using recolouring and rotations.

### Pseudocode
```
function insert(key, value):
    z ← new RED node(key, value)
    BST-insert z by key
    insertFixup(z)

function insertFixup(z):
    while z.parent.color = RED:
        if z.parent is a left child:
            uncle ← z.parent.parent.right
            if uncle.color = RED:                 # Case 1: recolour
                z.parent.color ← BLACK
                uncle.color   ← BLACK
                z.parent.parent.color ← RED
                z ← z.parent.parent
            else:
                if z is a right child:            # Case 2: rotate to Case 3
                    z ← z.parent ; leftRotate(z)
                z.parent.color ← BLACK            # Case 3
                z.parent.parent.color ← RED
                rightRotate(z.parent.parent)
        else: (mirror image: swap left/right)
    root.color ← BLACK

# range(lo, hi): in-order walk that prunes subtrees outside [lo,hi]
function range(lo, hi):
    if node = NIL: return
    if lo < node.key:  recurse left
    if lo ≤ node.key ≤ hi: emit node
    if node.key < hi:  recurse right
```

`leftRotate`/`rightRotate` re-link three nodes in O(1) to rebalance while
preserving the BST ordering.

### Complexity
| Operation | Time | Note |
|-----------|------|------|
| insert | **O(log n)** | recolour + at most 2 rotations |
| search | **O(log n)** | *guaranteed*, not just average |
| range(lo,hi) | **O(k + log n)** | k = results returned |

---

# 8. Graph (adjacency list) + Dijkstra / BFS

**File:** `src/lib/dsa/graph.ts`
**Used in:** `src/lib/routing.ts`, called from the **New Patient** form.

### Where & why — the most important algorithmic feature
When the receptionist selects the patient's **issue**, the system must route
them to the correct **specialist**. We model this as a directed weighted graph:

```
"chest pain" --1--> "Cardiology" --> (doctors)
"fracture"   --1--> "Orthopedics"
"headache"   --1--> "Neurology"
...
```

Nodes are symptoms and specialties; edges carry a weight (routing preference).
Given the matched symptom, **Dijkstra's shortest path** finds the best-matching
department, and then the department's doctors are ranked with our own
**quickSort** (by rating, then fee). The graph is rebuilt each request from the
`symptom_routes` table.

### How it is implemented
An **adjacency list**: a `Map` from node id → list of `{to, weight}` edges.
`shortestPath` is Dijkstra with a simple linear scan of the frontier (O(V²),
readable); `bfsPath` gives the fewest-hops path.

### Pseudocode (Dijkstra)
```
function shortestPath(start, goal):
    for every node n:  dist[n] ← ∞
    dist[start] ← 0
    visited ← { }
    while some node is unvisited:
        u ← unvisited node with smallest dist        # linear scan of frontier
        if u is null: break
        mark u visited
        if u = goal: break
        for each edge (u → v, weight):
            if dist[u] + weight < dist[v]:            # relax the edge
                dist[v] ← dist[u] + weight
                parent[v] ← u
    return reconstructPath(parent, start, goal), dist[goal]
```

### Complexity
| Operation | Time | Space |
|-----------|------|-------|
| addEdge | **O(1)** | O(V + E) |
| bfsPath | **O(V + E)** | fewest hops |
| shortestPath (Dijkstra) | **O(V²)** | linear-frontier variant |

---

# 9. Hash Map (separate chaining)

**File:** `src/lib/dsa/hash-map.ts`
**Used in:** DSA Gallery — models the **O(1) lookups** the app does constantly
(patient-by-ID, insurance-plan-by-ID, doctor-by-ID).

### Where & why
Rather than scanning a list every time we need a record by key, a hash map
gives **O(1) average** lookup. This implementation exposes the hashing and
collision handling that the language's built-in `Map` hides.

### How it is implemented
An array of **buckets**; each bucket is a list of `[key, value]` pairs
(**separate chaining**). A **djb2** string hash chooses the bucket. When the
load factor exceeds 0.75 the table **doubles and re-hashes**.

### Pseudocode
```
function hash(key):                       # djb2
    h ← 5381
    for each char c in key: h ← (h * 33) XOR code(c)
    return (h mod capacity)

function set(key, value):
    b ← buckets[hash(key)]
    for pair in b:                        # update if present
        if pair.key = key: pair.value ← value; return
    b.append([key, value]); size ← size + 1
    if size / capacity > 0.75: resize()   # grow + re-hash

function get(key):
    for [k, v] in buckets[hash(key)]:
        if k = key: return v
    return NOT_FOUND
```

### Complexity
| Operation | Time |
|-----------|------|
| set / get | **O(1)** average (O(n) worst if all keys collide) |

---

# 10. Dynamic Array

**File:** `src/lib/dsa/dynamic-array.ts`
**Used in:** DSA Gallery — models the **bill line-items** list and
**binary search** over sorted IDs.

### Where & why
Exposes the mechanics a native array hides: a fixed-capacity backing store that
**doubles when full** (amortized O(1) append), plus O(n) insert/delete-at and
**O(log n) binary search** on sorted data.

### Pseudocode
```
function push(value):                     # amortized O(1)
    if size = capacity: grow()            # allocate 2× and copy
    store[size] ← value ; size ← size + 1

function binarySearch(target, keyOf):     # sorted data only, O(log n)
    lo ← 0 ; hi ← size - 1
    while lo ≤ hi:
        mid ← (lo + hi) / 2
        k ← keyOf(store[mid])
        if k = target: return mid
        if k < target: lo ← mid + 1 else hi ← mid - 1
    return -1
```

### Complexity
| Operation | Time |
|-----------|------|
| get / set (random access) | **O(1)** |
| push | **O(1)** amortized (O(n) on resize) |
| insertAt / removeAt | **O(n)** |
| binarySearch | **O(log n)** |

---

# 11. Sorting algorithms

**File:** `src/lib/dsa/sorting.ts`
**Used in:** `src/lib/routing.ts` (quickSort ranks doctors) and the **live
sort-race** on `/dsa`.

### Where & why
Different screens sort by different keys — doctors by rating, bills by amount,
appointments by date. Five algorithms are implemented so the project can
**compare their real cost**: each returns the sorted array **plus a metrics
object** counting comparisons and swaps, which the `/dsa` sort-race displays.

### Pseudocode (the two O(n log n) ones)
```
function mergeSort(a):
    if length(a) ≤ 1: return a
    mid ← length(a) / 2
    return merge(mergeSort(a[0..mid]), mergeSort(a[mid..end]))

function merge(L, R):                      # combine two sorted halves
    out ← [ ]
    while L and R non-empty:
        if L[0] ≤ R[0]: out.append(L.removeFirst())
        else:           out.append(R.removeFirst())
    append leftovers of L and R
    return out

function quickSort(a, lo, hi):
    if lo ≥ hi: return
    p ← partition(a, lo, hi)               # pivot = a[hi]
    quickSort(a, lo, p-1)
    quickSort(a, p+1, hi)

function partition(a, lo, hi):
    pivot ← a[hi] ; i ← lo
    for j in lo..hi-1:
        if a[j] < pivot: swap(a[i], a[j]); i ← i + 1
    swap(a[i], a[hi]); return i
```

### Complexity
| Algorithm | Best | Average | Worst | Space | Stable |
|-----------|------|---------|-------|-------|--------|
| Bubble | O(n) | O(n²) | O(n²) | O(1) | yes |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | no |
| **Merge** | O(n log n) | O(n log n) | O(n log n) | O(n) | yes |
| **Quick** | O(n log n) | O(n log n) | O(n²) | O(log n) | no |

---

# Running the tests

```bash
npm run dsa:test      # 20 assertions covering every structure above
```

The test file `scripts/dsa-smoke.mts` proves each structure works — including
the key property that the **Red-Black tree stays balanced** (height 17 for 1000
sorted inserts) and that **Dijkstra** returns the correct symptom→doctor path.
