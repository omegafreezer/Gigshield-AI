import React, { useState, useEffect } from 'react';
import { getDashboardStats, getRiskZones, getAllClaims, getAllPolicies, simulateTrigger } from './services/api';

// ========================
// HELPER FUNCTIONS
// ========================

function getPerilEmoji(type) {
    const emojis = {
        'HEAVY_RAIN': '🌧️', 'EXTREME_HEAT': '🌡️', 'POOR_AQI': '🫁',
        'TRAFFIC_DISRUPTION': '🚗', 'AI_INCOME_DROP': '📉'
    };
    return emojis[type] || '⚡';
}

function getStatusColor(status) {
    const colors = {
        'PAID': '#059669', 'APPROVED': '#059669', 'ACTIVE': '#059669',
        'INITIATED': '#D97706', 'PENDING': '#D97706',
        'REJECTED': '#DC2626', 'FRAUD_FLAGGED': '#DC2626', 'CANCELLED': '#DC2626'
    };
    return colors[status] || '#6B7280';
}

function formatCurrency(val) {
    return '₹' + (parseFloat(val) || 0).toLocaleString('en-IN');
}

// ========================
// COMPONENTS
// ========================

function StatCard({ title, value, icon, color, sub }) {
    return (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `4px solid ${color}` }}>
            <div style={{ fontSize: '32px' }}>{icon}</div>
            <div>
                <p style={{ margin: 0, fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{title}</p>
                <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '700', color }}>{value}</p>
                {sub && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9CA3AF' }}>{sub}</p>}
            </div>
        </div>
    );
}

function Badge({ children, color }) {
    return (
        <span style={{ background: color + '20', color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
            {children}
        </span>
    );
}

function TableHeader({ cols }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '10px 16px', background: '#F9FAFB', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            {React.Children.map(children => children)}
        </div>
    );
}

// ========================
// TABS
// ========================

function DashboardTab({ stats }) {
    if (!stats) return <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>Loading stats...</p>;

    return (
        <div>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatCard title="Active Workers" value={stats.totalUsers || 0} icon="👷" color="#4F46E5" sub="Registered users" />
                <StatCard title="Active Policies" value={stats.activePolicies || 0} icon="📋" color="#059669" sub="Weekly coverage" />
                <StatCard title="Total Claims" value={stats.totalClaims || 0} icon="⚡" color="#D97706" sub={`${stats.paidClaims || 0} paid`} />
                <StatCard title="Total Payouts" value={formatCurrency(stats.totalPayouts)} icon="💰" color="#DC2626" sub="Disbursed to workers" />
                <StatCard title="Premiums Collected" value={formatCurrency(stats.totalPremiums)} icon="💳" color="#7C3AED" sub="Total revenue" />
                <StatCard
                    title="Loss Ratio"
                    value={`${stats.lossRatio || 0}%`}
                    icon="📊"
                    color={parseFloat(stats.lossRatio) > 80 ? '#DC2626' : '#059669'}
                    sub={parseFloat(stats.lossRatio) > 80 ? '⚠️ Above target' : '✅ Healthy'}
                />
                <StatCard title="Fraud Flagged" value={stats.fraudFlagged || 0} icon="🚫" color="#DC2626" sub="Held for review" />
            </div>

            {/* Predictive Analytics (Phase 3) */}
            {stats.predictiveAnalytics && (
                <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(79,70,229,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                            🔮 AI Predictive Forecast — Next 7 Days
                        </h3>
                        {stats.predictiveAnalytics.forecastGeneratedAt && (
                            <span style={{ fontSize: '11px', opacity: 0.65, background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '20px' }}>
                                Generated {new Date(stats.predictiveAnalytics.forecastGeneratedAt).toLocaleTimeString()}
                            </span>
                        )}
                    </div>

                    {/* Top KPI Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px 18px' }}>
                            <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected Claims</p>
                            <p style={{ margin: '6px 0 0', fontSize: '32px', fontWeight: '800', lineHeight: 1 }}>{stats.predictiveAnalytics.nextWeekForecastedClaims}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px 18px' }}>
                            <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forecasted Payouts</p>
                            <p style={{ margin: '6px 0 0', fontSize: '32px', fontWeight: '800', lineHeight: 1 }}>{formatCurrency(stats.predictiveAnalytics.nextWeekForecastedPayouts)}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px 18px' }}>
                            <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Risk Trend</p>
                            <p style={{ margin: '8px 0 0', fontSize: '16px', fontWeight: '700' }}>{stats.predictiveAnalytics.riskTrend}</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px 18px' }}>
                            <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Portfolio Risk</p>
                            <p style={{ margin: '6px 0 0', fontSize: '32px', fontWeight: '800', lineHeight: 1 }}>{((stats.predictiveAnalytics.globalAvgRisk || 0) * 100).toFixed(0)}%</p>
                        </div>
                    </div>

                    {/* High Risk Cities Breakdown */}
                    {stats.predictiveAnalytics.highRiskCities && stats.predictiveAnalytics.highRiskCities.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '16px' }}>
                            <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9 }}>
                                ⚠️ High-Risk Cities — Immediate Attention
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                {stats.predictiveAnalytics.highRiskCities.map((c, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '700', fontSize: '14px' }}>📍 {c.city}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.75 }}>{c.workerCount} workers at risk</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#FCD34D' }}>{(c.riskScore * 100).toFixed(0)}%</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '10px', opacity: 0.75 }}>~{c.forecastedClaims} claims</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state for high risk */}
                    {stats.predictiveAnalytics.highRiskCities && stats.predictiveAnalytics.highRiskCities.length === 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', opacity: 0.85 }}>
                            🟢 No high-risk cities detected — all zones operating within safe thresholds.
                        </div>
                    )}
                </div>
            )}

            {/* Claims by Type */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>Claims by Peril Type</h3>
                {(stats.claimsByType || []).length === 0
                    ? <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>No claims yet — simulate a trigger to see data!</p>
                    : (stats.claimsByType || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                            <span style={{ fontSize: '14px' }}>{getPerilEmoji(item.trigger_type)} {item.trigger_type.replace(/_/g, ' ')}</span>
                            <span style={{ fontSize: '14px', color: '#6B7280' }}>{item.count} claims</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#DC2626' }}>{formatCurrency(item.total)}</span>
                        </div>
                    ))
                }
            </div>

            {/* Recent Claims */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>Recent Claims</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB' }}>
                                {['Worker', 'City', 'Trigger', 'Amount', 'Fraud Score', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(stats.recentClaims || []).length === 0
                                ? <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>No claims yet</td></tr>
                                : (stats.recentClaims || []).map((claim, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                                        <td style={{ padding: '12px' }}>{claim.name || 'Unknown'}</td>
                                        <td style={{ padding: '12px' }}>{claim.city}</td>
                                        <td style={{ padding: '12px' }}>{getPerilEmoji(claim.trigger_type)} {claim.trigger_type.replace(/_/g, ' ')}</td>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>{formatCurrency(claim.payout_amount)}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ color: parseFloat(claim.fraud_score) > 0.7 ? '#DC2626' : '#059669' }}>
                                                {(parseFloat(claim.fraud_score || 0) * 100).toFixed(0)}%
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <Badge color={getStatusColor(claim.status)}>{claim.status}</Badge>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Workers by City */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>Workers by City</h3>
                {(stats.usersByCity || []).length === 0
                    ? <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>No data yet</p>
                    : (stats.usersByCity || []).map((item, i) => {
                        const maxCount = Math.max(...(stats.usersByCity || []).map(c => parseInt(c.count)));
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ width: '90px', fontSize: '13px', fontWeight: '500' }}>{item.city}</span>
                                <div style={{ flex: 1, background: '#F3F4F6', borderRadius: '4px', height: '22px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(parseInt(item.count) / maxCount) * 100}%`, background: 'linear-gradient(90deg, #4F46E5, #7C3AED)', borderRadius: '4px', transition: 'width 0.5s' }} />
                                </div>
                                <span style={{ width: '24px', textAlign: 'right', fontWeight: '700', fontSize: '13px' }}>{item.count}</span>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}

function SimulateTab({ onSuccess }) {
    const [simCity, setSimCity] = useState('Mumbai');
    const [simTrigger, setSimTrigger] = useState('HEAVY_RAIN');
    const [simValue, setSimValue] = useState('');
    const [simResult, setSimResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSimulate = async () => {
        setLoading(true);
        setSimResult(null);
        try {
            const res = await simulateTrigger({ city: simCity, triggerType: simTrigger, value: simValue ? parseFloat(simValue) : undefined });
            setSimResult({ success: true, data: res.data });
            if (onSuccess) onSuccess();
        } catch (error) {
            setSimResult({ success: false, error: error.response?.data?.error || error.message });
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', background: 'white', marginTop: '6px' };
    const labelStyle = { display: 'block', fontWeight: '600', fontSize: '13px', color: '#374151' };

    return (
        <div style={{ background: 'white', borderRadius: '12px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxWidth: '600px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>🧪 Simulate Trigger Event</h3>
            <p style={{ margin: '0 0 24px', color: '#6B7280', fontSize: '14px' }}>
                Simulate a weather/disruption event to trigger automatic claims for all active policies in the selected city.
                This is how judges can see the full zero-touch automation live.
            </p>

            <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>City</label>
                <select style={inputStyle} value={simCity} onChange={e => setSimCity(e.target.value)}>
                    {['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'].map(c => <option key={c}>{c}</option>)}
                </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Trigger Type</label>
                <select style={inputStyle} value={simTrigger} onChange={e => setSimTrigger(e.target.value)}>
                    <option value="HEAVY_RAIN">🌧️ Heavy Rain (threshold: 50mm/hr)</option>
                    <option value="EXTREME_HEAT">🌡️ Extreme Heat (threshold: 42°C)</option>
                    <option value="POOR_AQI">🫁 Poor AQI (threshold: 300)</option>
                    <option value="TRAFFIC_DISRUPTION">🚗 Traffic Disruption (threshold: 5km/hr)</option>
                </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Custom Value <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional — leave blank to use default)</span></label>
                <input
                    type="number"
                    style={inputStyle}
                    placeholder="e.g. 65 for 65mm rainfall"
                    value={simValue}
                    onChange={e => setSimValue(e.target.value)}
                />
            </div>

            <button
                style={{ background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #DC2626, #B91C1C)', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', width: '100%' }}
                onClick={handleSimulate}
                disabled={loading}
            >
                {loading ? '⏳ Processing...' : '⚡ Simulate Trigger & Create Claims'}
            </button>

            {simResult && (
                <div style={{ marginTop: '20px', border: `2px solid ${simResult.success ? '#059669' : '#DC2626'}`, borderRadius: '10px', padding: '16px', background: simResult.success ? '#F0FDF4' : '#FEF2F2' }}>
                    <p style={{ margin: '0 0 8px', fontWeight: '700', color: simResult.success ? '#059669' : '#DC2626' }}>
                        {simResult.success ? '✅ Trigger simulated! Claims created for all active policies in ' + simCity : '❌ Error'}
                    </p>
                    <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', color: '#374151' }}>
                        {JSON.stringify(simResult.success ? simResult.data : { error: simResult.error }, null, 2)}
                    </pre>
                </div>
            )}

            <div style={{ marginTop: '24px', padding: '16px', background: '#EEF2FF', borderRadius: '10px', fontSize: '13px', color: '#4338CA' }}>
                <strong>💡 Demo tip:</strong> After simulating, go to the Dashboard tab to see the claim appear in "Recent Claims" and KPIs update automatically. The seeded users (Ramesh Kumar in Mumbai, Priya Sharma in Delhi etc.) will receive automatic payouts.
            </div>
        </div>
    );
}

function RiskZonesTab({ riskZones }) {
    return (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>📍 Risk Zone Analysis</h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#F9FAFB' }}>
                            {['City', 'Zone', 'Workers', 'Avg Risk', 'Claims', 'Total Payouts'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {riskZones.length === 0
                            ? <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>No data yet</td></tr>
                            : riskZones.map((zone, i) => {
                                const risk = parseFloat(zone.avg_risk) || 0;
                                const riskColor = risk > 0.7 ? '#DC2626' : risk > 0.5 ? '#D97706' : '#059669';
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{zone.city}</td>
                                        <td style={{ padding: '12px' }}>{zone.zone}</td>
                                        <td style={{ padding: '12px' }}>{zone.worker_count}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ color: riskColor, fontWeight: '700' }}>{(risk * 100).toFixed(0)}%</span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{zone.total_claims}</td>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>{formatCurrency(zone.total_payouts)}</td>
                                    </tr>
                                );
                            })
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CurlTab() {
    const commands = [
        {
            label: '1. Health check',
            cmd: `curl http://localhost:3000/health`
        },
        {
            label: '2. ML service health',
            cmd: `curl http://localhost:8000/health`
        },
        {
            label: '3. Simulate WhatsApp onboarding (say hi)',
            cmd: `curl -X POST http://localhost:3000/api/whatsapp/webhook \\
  -d "From=whatsapp:+919999999999&Body=hi"`
        },
        {
            label: '4. Continue onboarding (select Mumbai)',
            cmd: `curl -X POST http://localhost:3000/api/whatsapp/webhook \\
  -d "From=whatsapp:+919999999999&Body=1"`
        },
        {
            label: '5. Simulate HEAVY_RAIN trigger in Mumbai',
            cmd: `curl -X POST http://localhost:3000/api/claims/simulate-trigger \\
  -H "Content-Type: application/json" \\
  -d '{"city":"Mumbai","triggerType":"HEAVY_RAIN","value":65}'`
        },
        {
            label: '6. Simulate EXTREME_HEAT trigger in Delhi',
            cmd: `curl -X POST http://localhost:3000/api/claims/simulate-trigger \\
  -H "Content-Type: application/json" \\
  -d '{"city":"Delhi","triggerType":"EXTREME_HEAT","value":45}'`
        },
        {
            label: '7. Get AI risk score from ML service',
            cmd: `curl -X POST http://localhost:8000/predict/risk \\
  -H "Content-Type: application/json" \\
  -d '{"city":"Mumbai","zone":"Andheri","delivery_type":"food_delivery","working_hours_start":9,"working_hours_end":21,"average_daily_income":850}'`
        },
        {
            label: '8. Run fraud detection',
            cmd: `curl -X POST http://localhost:8000/predict/fraud \\
  -H "Content-Type: application/json" \\
  -d '{"user_id":"test","city":"Mumbai","zone":"Andheri","trigger_type":"HEAVY_RAIN","claim_amount":350,"weekly_claim_count":1,"days_since_registration":45,"gps_consistency":0.92}'`
        },
        {
            label: '9. View dashboard stats',
            cmd: `curl http://localhost:3000/api/admin/dashboard`
        },
        {
            label: '10. View all claims',
            cmd: `curl http://localhost:3000/api/claims`
        }
    ];

    return (
        <div>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700' }}>🖥️ Demo Commands</h3>
                <p style={{ margin: '0 0 16px', color: '#6B7280', fontSize: '13px' }}>Copy-paste these into your terminal to demo the full system. Run them in order for the best demo flow.</p>
                {commands.map((c, i) => (
                    <div key={i} style={{ marginBottom: '16px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>{c.label}</p>
                        <pre style={{ margin: 0, background: '#1E293B', color: '#E2E8F0', padding: '14px 16px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{c.cmd}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ========================
// MAIN APP
// ========================

export default function App() {
    const [stats, setStats] = useState(null);
    const [riskZones, setRiskZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            setError(null);
            const [statsRes, zonesRes] = await Promise.all([
                getDashboardStats(),
                getRiskZones()
            ]);
            setStats(statsRes.data);
            setRiskZones(zonesRes.data);
            setLastRefresh(new Date());
        } catch (err) {
            setError('Cannot connect to backend. Make sure the backend is running on port 3000.');
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'simulate', label: '🧪 Simulate' },
        { id: 'risk-zones', label: '📍 Risk Zones' },
        { id: 'demo-commands', label: '🖥️ Demo Commands' }
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F3F4F6' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTop: '4px solid #4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading GigShield Dashboard...</p>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#F3F4F6', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', color: 'white', padding: '18px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>🛡️ GigShield AI</h1>
                    <p style={{ margin: '2px 0 0', opacity: 0.7, fontSize: '13px' }}>Admin Dashboard · DEVTrails 2026</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', opacity: 0.6 }}>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
                    <span style={{ background: '#059669', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }} className="live-dot">● LIVE</span>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '12px 32px', color: '#DC2626', fontSize: '13px' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Navigation */}
            <nav style={{ background: 'white', padding: '0 32px', display: 'flex', borderBottom: '1px solid #E5E7EB', gap: '0' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        style={{ padding: '14px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: activeTab === tab.id ? '#4F46E5' : '#6B7280', borderBottom: activeTab === tab.id ? '2px solid #4F46E5' : '2px solid transparent' }}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
                <button
                    style={{ marginLeft: 'auto', padding: '10px 16px', border: '1px solid #E5E7EB', background: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#6B7280', alignSelf: 'center' }}
                    onClick={fetchData}
                >
                    🔄 Refresh
                </button>
            </nav>

            {/* Main */}
            <main style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
                {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
                {activeTab === 'simulate' && <SimulateTab onSuccess={fetchData} />}
                {activeTab === 'risk-zones' && <RiskZonesTab riskZones={riskZones} />}
                {activeTab === 'demo-commands' && <CurlTab />}
            </main>
        </div>
    );
}
