"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { formatUnits } from "ethers";
import { useShallow } from "zustand/shallow";

// Domain & Store Imports
import DataFeed from "@/domain/datafeed/definedDatafeed";
import { useChartDataStore } from "@/store/useChartData";
import {
  getDynamicChartOverrides,
  enabledFeatures,
} from "@/constants/common/chart";
import { PRECISION_DECIMALS } from "@/constants/common/utils";

// --- Utility Functions ---
const getTheme = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("theme") || "dark";
  }
  return "dark";
};

const TradingViewAdvancedChart = React.memo(
  ({ chainId, symbol, address, pairAddress, quoteToken, createdAt }) => {
    // --- State & Refs ---
    const [chartReady, setChartReady] = useState(false);
    const chartContainerRef = useRef(null);
    const tvWidgetRef = useRef(null);
    
    // Tracking References (for cleanup)
    const linesRef = useRef([]);      // Stores IDs of drawn order lines
    const studyRef = useRef(null);    // Stores ID of the active indicator study

    // --- Store Data ---
    const { ordersOnChart, indicatorOnChart } = useChartDataStore(
      useShallow((state) => ({
        ordersOnChart: state.ordersOnChart,
        indicatorOnChart: state.indicatorOnChart,
      }))
    );

    // --- Logic: Draw Order Lines ---
    const drawLineOnChart = useCallback(() => {
      if (!chartReady || !tvWidgetRef.current) return;

      const chart = tvWidgetRef.current.activeChart();

      // 1. Cleanup existing lines
      linesRef.current.forEach((line) => line.remove && line.remove());
      linesRef.current = [];

      // 2. Guard clause if no orders
      if (!ordersOnChart || ordersOnChart.length === 0) return;

      // 3. Draw new lines
      ordersOnChart.forEach((order) => {
        const commonStyle = {
          disableUndo: true,
          quantity: "",
          lineStyle: 1,
          lineLength: 1,
          bodyFont: `normal 12pt "Hanken Grotesk", sans-serif`,
          bodyTextColor: "#fff",
        };

        // Long Orders (TP/SL)
        if (order.orderStatus === "Opened" && order.orderType === "long") {
          // Take Profit Line
          const tpPrice = formatUnits(BigInt(order.takeProfit?.takeProfitPrice || 0), PRECISION_DECIMALS);
          const tpLine = chart
            .createPositionLine({ ...commonStyle })
            .setText(`${order.name}_TP`)
            .setPrice(tpPrice)
            .setLineColor("#278404")
            .setBodyBackgroundColor("#278404")
            .setBodyBorderColor("#60f000");
          linesRef.current.push(tpLine);

          // Stop Loss Line
          const slPrice = formatUnits(BigInt(order.stopLoss?.stopLossPrice || 0), PRECISION_DECIMALS);
          const slLine = chart
            .createPositionLine({ ...commonStyle })
            .setText(`${order.name}_SL`)
            .setPrice(slPrice)
            .setLineColor("#e3090d")
            .setBodyBackgroundColor("#e3090d")
            .setBodyBorderColor("#e3090d");
          linesRef.current.push(slLine);
        }

        // Short/Pending Orders (Entry)
        if (order.orderStatus === "Pending" && order.orderType === "short") {
          const entryPrice = formatUnits(BigInt(order.target?.shortTarget || 0), PRECISION_DECIMALS);
          const entryLine = chart
            .createPositionLine({ ...commonStyle })
            .setText(`${order.name}_Entry`)
            .setPrice(entryPrice)
            .setBodyTextColor("#000")
            .setLineColor("#e0d5d5")
            .setBodyBackgroundColor("#e0d5d5")
            .setBodyBorderColor("#e0d5d5");
          linesRef.current.push(entryLine);
        }
      });
    }, [chartReady, ordersOnChart]);

    // --- Logic: Add/Remove Indicators ---
    const updateIndicatorOnChart = useCallback(() => {
      if (!chartReady || !tvWidgetRef.current) return;

      const chart = tvWidgetRef.current.activeChart();

      // 1. Remove existing study if it exists
      if (studyRef.current) {
        try {
          chart.removeEntity(studyRef.current);
          studyRef.current = null;
        } catch (e) {
          console.warn("Failed to remove entity:", e);
        }
      }

      // 2. Add new study if valid data exists
      if (
        indicatorOnChart?.indicatorName &&
        indicatorOnChart?.period
      ) {
        try {
          // createStudy(name, forceOverlay, lock, inputs, overrides)
          studyRef.current = chart.createStudy(
            indicatorOnChart.indicatorName,
            false, 
            false,
            [parseInt(indicatorOnChart.period)] 
          );
        } catch (e) {
          console.error("Failed to create study:", e);
        }
      }
    }, [chartReady, indicatorOnChart]);

    // --- Effect: Handle Order Lines ---
    useEffect(() => {
      drawLineOnChart();
      // Cleanup lines when component unmounts
      return () => {
        linesRef.current.forEach((line) => line.remove && line.remove());
        linesRef.current = [];
      };
    }, [drawLineOnChart]);

    // --- Effect: Handle Indicators ---
    useEffect(() => {
      updateIndicatorOnChart();
      // Cleanup study when component unmounts
      return () => {
        if (studyRef.current && tvWidgetRef.current) {
          try {
            tvWidgetRef.current.activeChart().removeEntity(studyRef.current);
            studyRef.current = null;
          } catch (e) {
             // widget might already be destroyed, ignore
          }
        }
      };
    }, [updateIndicatorOnChart]);

    // --- Effect: Initialize Chart Widget ---
    useEffect(() => {
      const scriptId = "tradingview-widget-script";
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "/charting_library/charting_library.js";
      script.async = true;

      const initWidget = () => {
        if (window.TradingView && chartContainerRef.current) {
          const dataFeed = new DataFeed(
            chainId,
            address,
            pairAddress,
            quoteToken,
            createdAt
          );
          const currentTheme = getTheme();
          const dynamicOverrides = getDynamicChartOverrides(currentTheme);

          const widgetOptions = {
            container: chartContainerRef.current,
            datafeed: dataFeed,
            library_path: "/charting_library/",
            autosize: true,
            symbol: symbol,
            interval: "60",
            timezone: "Etc/UTC",
            theme: currentTheme,
            style: "1",
            locale: "en",
            enable_publishing: false,
            allow_symbol_change: false,
            overrides: dynamicOverrides,
            save_image: false,
            studies: [], // Start empty, let the effect handle adding studies
            disabled_features: ["header_symbol_search", "header_compare"],
            custom_css_url: "/tradingview-chart.css",
            enabled_features: enabledFeatures,
          };

          const widget = new window.TradingView.widget(widgetOptions);
          tvWidgetRef.current = widget;

          widget.onChartReady(() => {
            setChartReady(true);
            // Optional: Force a data refresh if needed
             // widget.activeChart().dataReady(); 
          });
        }
      };

      script.onload = initWidget;
      document.body.appendChild(script);

      return () => {
        // Cleanup widget
        if (tvWidgetRef.current) {
          try {
            tvWidgetRef.current.remove();
          } catch(e) {
            console.warn("Error removing widget", e);
          }
          tvWidgetRef.current = null;
          setChartReady(false);
        }
        // Cleanup script
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          existingScript.remove();
        }
      };
    }, [symbol, chainId, address, pairAddress, quoteToken, createdAt]);

    // --- Effect: Theme Switcher ---
    useEffect(() => {
      const handleThemeChange = () => {
        if (tvWidgetRef.current && chartReady) {
          const newTheme = getTheme();
          tvWidgetRef.current.changeTheme(newTheme);
          
          const dynamicOverrides = getDynamicChartOverrides(newTheme);
          tvWidgetRef.current.activeChart().applyOverrides(dynamicOverrides);
        }
      };

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "class") {
            handleThemeChange();
          }
        });
      });

      if (typeof window !== "undefined") {
        observer.observe(document.documentElement, { attributes: true });
      }

      return () => observer.disconnect();
    }, [chartReady]);

    return (
      <div
        id="tradingview_advanced_chart"
        ref={chartContainerRef}
        style={{ height: "100%", width: "100%", borderRadius: "10px", overflow: "hidden" }}
      />
    );
  }
);

export default TradingViewAdvancedChart;