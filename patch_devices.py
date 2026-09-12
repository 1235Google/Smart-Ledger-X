import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

# Add AnimatedDeviceGraphic import
if "AnimatedDeviceGraphic" not in code:
    code = code.replace("import { startRegistration }", "import AnimatedDeviceGraphic from '../components/AnimatedDeviceGraphic';\nimport { startRegistration }")


state_hook = """  // Modals state
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);"""

new_state_hook = """  // Edit device state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');

  // Modals state
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);"""

code = code.replace(state_hook, new_state_hook)

action_hook = """  // Actions
  const handleRevokeAll = async () => {"""

new_action_hook = """  // Actions
  const handleRenameDevice = async (deviceId: string) => {
    if (!editDeviceName.trim()) {
      setEditingDeviceId(null);
      return;
    }
    await updateUserDevice(activeUserUid, deviceId, { deviceName: editDeviceName });
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, deviceName: editDeviceName } : d));
    setEditingDeviceId(null);
    createNotification({ title: 'Device Renamed', message: 'The device name has been updated.', type: 'success' });
  };
  
  const fetchExactLocation = async (deviceId: string) => {
    try {
      // Free IP to location API
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.city && data.country_name) {
        const exactLocation = {
          country: data.country_name,
          region: data.region,
          city: data.city,
          source: 'Client-side Geolocation (Exact)'
        };
        const newIp = data.ip || 'Unknown';
        await updateUserDevice(activeUserUid, deviceId, { location: exactLocation, ip: newIp });
        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, location: exactLocation, ip: newIp } : d));
      }
    } catch (e) {
      console.warn("Failed to fetch exact location:", e);
    }
  };

  const handleRevokeAll = async () => {"""

code = code.replace(action_hook, new_action_hook)

render_old = """            {devices.map(device => (
              <div key={device.id} className="bg-[#1a1b23] border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-white">
                    {getDeviceIcon(device.deviceType || '')}
                  </div>
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      {device.deviceName}
                      {device.isCurrent && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full uppercase font-bold tracking-wider">This Device</span>}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1"><MapPin size={14}/> {device.location?.city || 'Unknown Location'}</span>
                      <span className="flex items-center gap-1"><Globe size={14}/> IP: {device.ip || 'Unknown'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Last active: {device.lastActive ? format(new Date(device.lastActive), 'MMM d, h:mm a') : 'Recently'}
                    </p>
                  </div>
                </div>
                {!device.isCurrent && (
                  <button 
                    onClick={() => handleRevokeDevice(device.id)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ))}"""

render_new = """            {devices.map(device => (
              <motion.div layout key={device.id} className="bg-gradient-to-br from-[#1a1b23] to-[#12131a] border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-start gap-5 w-full">
                  <div className="shrink-0 mt-1">
                    <AnimatedDeviceGraphic type={device.deviceType?.toLowerCase() || 'desktop'} isCurrent={device.isCurrent} />
                  </div>
                  <div className="flex-1 w-full">
                    {editingDeviceId === device.id ? (
                      <div className="flex items-center gap-2 mb-2 w-full max-w-sm">
                        <input 
                          type="text" 
                          value={editDeviceName}
                          onChange={(e) => setEditDeviceName(e.target.value)}
                          className="bg-black/40 border border-white/20 text-white px-3 py-1.5 rounded-lg w-full text-sm outline-none focus:border-blue-500 transition-colors"
                          autoFocus
                          onKeyDown={(e) => { if(e.key === 'Enter') handleRenameDevice(device.id) }}
                        />
                        <button onClick={() => handleRenameDevice(device.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"><Check size={16} /></button>
                        <button onClick={() => setEditingDeviceId(null)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"><X size={16} /></button>
                      </div>
                    ) : (
                      <h4 className="font-bold text-white flex items-center gap-3 text-lg mb-1">
                        {device.deviceName}
                        <button 
                          onClick={() => { setEditingDeviceId(device.id); setEditDeviceName(device.deviceName); }}
                          className="text-slate-500 hover:text-white transition-colors"
                          title="Rename Device"
                        >
                          <Edit2 size={14} />
                        </button>
                        {device.isCurrent && <span className="px-2.5 py-0.5 bg-[#0a84ff]/20 border border-[#0a84ff]/30 text-[#0a84ff] text-xs rounded-full uppercase font-bold tracking-wider shadow-[0_0_10px_rgba(10,132,255,0.2)]">This Device</span>}
                      </h4>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} className={device.location?.city ? 'text-emerald-400' : 'text-slate-500'}/> 
                        {device.location?.city ? `${device.location.city}, ${device.location.country}` : 'Unknown Location'}
                        {device.isCurrent && (!device.location?.city || device.ip === '127.0.0.1') && (
                          <button onClick={() => fetchExactLocation(device.id)} className="ml-1 text-xs text-blue-400 hover:text-blue-300 underline">Get Exact Location</button>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5"><Globe size={14} className="text-blue-400"/> {device.ip || 'Unknown IP'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-medium bg-black/20 inline-block px-2 py-1 rounded-md">
                      Last active: {device.lastActive ? format(new Date(device.lastActive), 'MMM d, yyyy h:mm a') : 'Recently'}
                    </p>
                  </div>
                </div>
                {!device.isCurrent && (
                  <button 
                    onClick={() => handleRevokeDevice(device.id)}
                    className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-bold rounded-xl transition-all text-sm whitespace-nowrap shadow-lg flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                )}
              </motion.div>
            ))}"""

code = code.replace(render_old, render_new)

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
