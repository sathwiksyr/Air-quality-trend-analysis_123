import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

function Dashboard({ setIsLoggedIn }) {
  const [data, setData] = useState([]);
  const [user, setUser] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // Fetch Air Data
    axios
      .get(`${API_URL}/api/airdata`, { headers })
      .then((res) => setData(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      });

    // Fetch User Data
    axios
      .get(`${API_URL}/api/user`, { headers })
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      });

  }, [API_URL, setIsLoggedIn]);

  /* ================= BASIC ANALYTICS ================= */

  const avgAQI = data.length
    ? (data.reduce((sum, item) => sum + item.aqi, 0) / data.length).toFixed(1)
    : 0;

  const maxPM = data.length
    ? Math.max(...data.map((item) => item.pm25))
    : 0;

  /* ================= YEARLY TREND ================= */

  const yearlyData = {};
  data.forEach((item) => {
    const year = new Date(item.date).getFullYear();
    if (!yearlyData[year]) yearlyData[year] = [];
    yearlyData[year].push(item.aqi);
  });

  const years = Object.keys(yearlyData);

  const yearlyAvgAQI = years.map(
    (year) =>
      yearlyData[year].reduce((a, b) => a + b, 0) /
      yearlyData[year].length
  );

  /* ================= SEASONAL VARIATION ================= */

  const monthlyData = {};
  data.forEach((item) => {
    const month = new Date(item.date).getMonth();
    if (!monthlyData[month]) monthlyData[month] = [];
    monthlyData[month].push(item.aqi);
  });

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const seasonalAvg = months.map((_, index) => {
    if (!monthlyData[index]) return 0;
    return (
      monthlyData[index].reduce((a, b) => a + b, 0) /
      monthlyData[index].length
    );
  });

  /* ================= TREND CALCULATION ================= */

  function calculateTrend(values) {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * values[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);

    return (
      (n * sumXY - sumX * sumY) /
      (n * sumX2 - sumX * sumX)
    );
  }

  const trendSlope = calculateTrend(yearlyAvgAQI);

  const predictedNextYear =
    yearlyAvgAQI.length
      ? yearlyAvgAQI[yearlyAvgAQI.length - 1] + trendSlope
      : 0;

  /* ================= CHART CONFIG ================= */

  const mainChart = {
    labels: data.map((item) => item.date),
    datasets: [
      {
        label: "PM2.5",
        data: data.map((item) => item.pm25),
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.2)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "AQI",
        data: data.map((item) => item.aqi),
        borderColor: "#f43f5e",
        backgroundColor: "rgba(244,63,94,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const trendChart = {
    labels: years,
    datasets: [
      {
        label: "Yearly AQI Trend",
        data: yearlyAvgAQI,
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const seasonalChart = {
    labels: months,
    datasets: [
      {
        label: "Seasonal AQI Variation",
        data: seasonalAvg,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: { duration: 1200 },
    plugins: { legend: { position: "top" } },
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  };

  return (
    <div style={{ background:"#0b1f3a", minHeight:"100vh", color:"white", padding:"30px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1>Air Quality Dashboard</h1>

        {user && (
          <div style={{ display:"flex", alignItems:"center", gap:"15px" }}>
            <img
              src={user.profilePic}
              alt="profile"
              style={{ width:"40px", borderRadius:"50%" }}
            />
            <span>{user.name}</span>
            <button
              onClick={handleLogout}
              style={{
                background:"#f43f5e",
                color:"white",
                border:"none",
                padding:"8px 15px",
                borderRadius:"5px",
                cursor:"pointer"
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))",
        gap:"20px",
        marginTop:"30px"
      }}>
        <Card title="Average AQI" value={avgAQI} />
        <Card title="Max PM2.5" value={maxPM} />
        <Card title="Trend Slope" value={trendSlope.toFixed(2)} />
        <Card title="Predicted Next Year AQI" value={predictedNextYear.toFixed(1)} />
      </div>

      <Section title="Daily AQI & PM2.5">
        <Line data={mainChart} options={options} />
      </Section>

      <Section title="Pollution Trend">
        <Line data={trendChart} options={options} />
      </Section>

      <Section title="Seasonal Variation">
        <Line data={seasonalChart} options={options} />
      </Section>
    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

const Card = ({ title, value }) => (
  <div style={{
    background:"#1c3c5d",
    padding:"20px",
    borderRadius:"10px",
    textAlign:"center"
  }}>
    <h3>{title}</h3>
    <h2>{value}</h2>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{
    marginTop:"40px",
    background:"#122b4a",
    padding:"20px",
    borderRadius:"10px"
  }}>
    <h2 style={{ marginBottom:"15px" }}>{title}</h2>
    {children}
  </div>
);

export default Dashboard;