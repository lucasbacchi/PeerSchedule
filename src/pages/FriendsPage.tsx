import { useEffect, useState } from 'react'
import svgPaths from '@/imports/svg-l5xzino1q2'

type FriendStatus = 'accept' | 'pending' | 'active'
type DisplayStatus = FriendStatus | 'accepted'

interface Friend {
  id: number
  name: string
  calendars: string
  email: string
  status: FriendStatus
}

const INITIAL_FRIENDS: Friend[] = [
  { id: 1, name: 'Alex Rivera', calendars: 'Work, Personal', email: 'alex.rivera@email.com', status: 'accept' },
  { id: 2, name: 'Jordan Kim', calendars: 'School', email: 'jordan.kim@email.com', status: 'pending' },
  { id: 3, name: 'Morgan Chen', calendars: 'Family, Work', email: 'morgan.chen@email.com', status: 'active' },
  { id: 4, name: 'Casey Patel', calendars: 'Personal', email: 'casey.patel@email.com', status: 'accept' },
  { id: 5, name: 'Taylor Nguyen', calendars: 'Work', email: 'taylor.nguyen@email.com', status: 'pending' },
  { id: 6, name: 'Riley Johnson', calendars: 'School, Personal', email: 'riley.j@email.com', status: 'active' },
  { id: 7, name: 'Drew Martinez', calendars: 'Work, Family', email: 'drew.m@email.com', status: 'accept' },
  { id: 8, name: 'Quinn Williams', calendars: 'Personal', email: 'quinn.w@email.com', status: 'pending' },
  { id: 9, name: 'Avery Thompson', calendars: 'School', email: 'avery.t@email.com', status: 'active' },
  { id: 10, name: 'Sam Davis', calendars: 'Work, School', email: 'sam.davis@email.com', status: 'pending' },
  { id: 11, name: 'Jamie Wilson', calendars: 'Family', email: 'jamie.w@email.com', status: 'accept' },
]

function TrashIcon() {
  return (
    <svg fill="none" viewBox="0 0 40 44" className="w-6 h-6">
      <path
        d={svgPaths.p2a499000}
        stroke="#EC221F"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </svg>
  )
}

function StatusBadge({
  status,
  onAccept,
}: {
  status: DisplayStatus
  onAccept: () => void
}) {
  if (status === 'accept') {
    return (
      <button
        type="button"
        onClick={onAccept}
        className="font-bold text-[#2563eb] text-base hover:text-[#1d4ed8] hover:underline cursor-pointer transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] rounded px-1"
      >
        Accept
      </button>
    )
  }
  if (status === 'accepted') {
    return (
      <span className="font-bold text-green-600 text-base">Accepted ✓</span>
    )
  }
  if (status === 'active') {
    return (
      <span className="font-bold text-[#16a34a] text-base">Active</span>
    )
  }
  return <span className="font-bold text-base text-yellow-600">Pending</span>
}

export default function FriendsPage() {
  const FRIENDS_ACTIVE_STORAGE_KEY = 'PeerScheduleFriendsActiveIds'
  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'friends' | 'pending'>('all')
  const [acceptedIds, setAcceptedIds] = useState<number[]>([])
  const [activeIds, setActiveIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(FRIENDS_ACTIVE_STORAGE_KEY)
    if (!stored) return []
    try {
      return JSON.parse(stored) as number[]
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(FRIENDS_ACTIVE_STORAGE_KEY, JSON.stringify(activeIds))
  }, [activeIds])

  const handleAccept = (id: number) => {
    setAcceptedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActiveIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const handleDelete = (id: number) => {
    setFriends((prev) => prev.filter((f) => f.id !== id))
  }

  const filtered = friends.filter((f) => {
    const currentStatus: DisplayStatus = acceptedIds.includes(f.id)
      ? 'accepted'
      : activeIds.includes(f.id)
      ? 'active'
      : f.status

    const matchSearch =
      search === '' ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'pending' && (currentStatus === 'pending' || currentStatus === 'accept')) ||
      (filter === 'friends' && (currentStatus === 'active' || currentStatus === 'accepted'))
    return matchSearch && matchFilter
  })


  return (
    <div className="bg-white min-h-screen flex flex-col font-['Inter',sans-serif]">
      <main className="flex-1 px-16 pt-10 pb-16">
        <h1 className="text-[32px] font-bold text-[#0f172a] tracking-tight mb-5">
            Friend Management
        </h1>

        <div className="bg-white rounded-3xl shadow-md border border-[#e2e8f0] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[#0f172a] text-xl tracking-tight">Friends Search</h2>
            <button className="bg-[#2563eb] text-white font-semibold text-lg px-6 py-3 rounded-lg hover:bg-[#1d4ed8] transition-colors shadow-sm">
              Add Friend
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#f9fafb] border-2 border-[#e2e8f0] rounded-full h-[52px] w-64 px-6 text-[#64748b] font-semibold text-lg shadow-sm focus:outline-none focus:border-[#2563eb] transition-colors"
            />
            <button
              onClick={() => setFilter('all')}
              className={`bg-[#f9fafb] border-2 border-[#e2e8f0] rounded-full h-[52px] px-7 font-semibold text-lg shadow-sm transition-colors ${filter === 'all' ? 'border-[#2563eb] text-[#2563eb]' : 'text-[#64748b] hover:border-[#94a3b8]'}`}
            >
              Filter
            </button>
            <button
              onClick={() => setFilter('friends')}
              className={`bg-[#f9fafb] border-2 border-[#e2e8f0] rounded-full h-[52px] px-7 font-semibold text-lg shadow-sm transition-colors ${filter === 'friends' ? 'border-[#2563eb] text-[#2563eb]' : 'text-[#64748b] hover:border-[#94a3b8]'}`}
            >
              Friends
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`bg-[#f9fafb] border-2 border-[#e2e8f0] rounded-full h-[52px] px-7 font-semibold text-lg shadow-sm transition-colors ${filter === 'pending' ? 'border-[#2563eb] text-[#2563eb]' : 'text-[#64748b] hover:border-[#94a3b8]'}`}
            >
              Pending
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border-2 border-[#e2e8f0]">
            <div className="grid grid-cols-[2fr_2fr_2.5fr_1.2fr_0.5fr] bg-[#f1f5f9] border-b-2 border-[#e2e8f0]">
              {['Name', 'Calendars', 'Email', 'Status', 'Del'].map((col) => (
                <div
                  key={col}
                  className="px-6 py-5 font-bold text-[#0f172a] text-lg border-r border-[#e2e8f0] last:border-r-0"
                >
                  {col}
                </div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center text-[#64748b] text-base">
                No results found.
              </div>
            ) : (
              filtered.map((friend, i) => (
                <div
                  key={friend.id}
                  className={`grid grid-cols-[2fr_2fr_2.5fr_1.2fr_0.5fr] border-b border-[#e2e8f0] last:border-b-0 ${i % 2 === 0 ? 'bg-[#f9fafb]' : 'bg-[#e5e7eb]'} hover:bg-blue-50 transition-colors`}
                >
                  <div className="px-6 py-5 text-[#0f172a] text-base font-medium border-r border-[#e2e8f0] flex items-center">
                    {friend.name}
                  </div>
                  <div className="px-6 py-5 text-[#0f172a] text-base border-r border-[#e2e8f0] flex items-center">
                    {friend.calendars}
                  </div>
                  <div className="px-6 py-5 text-[#0f172a] text-base border-r border-[#e2e8f0] flex items-center">
                    {friend.email}
                  </div>
                  <div className="px-6 py-5 border-r border-[#e2e8f0] flex items-center">
                    <StatusBadge
                      status={acceptedIds.includes(friend.id) ? 'accepted' : activeIds.includes(friend.id) ? 'active' : friend.status}
                      onAccept={() => handleAccept(friend.id)}
                    />
                  </div>
                  <div className="px-4 py-5 flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(friend.id)}
                      className="hover:scale-110 transition-transform active:scale-95"
                      aria-label="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}