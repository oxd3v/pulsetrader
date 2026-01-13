"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
//datafeed
import DataFeed from "@/domain/datafeed/definedDatafeed";
//external lib
import { formatUnits } from "ethers";
// configuration
import {
  getDynamicChartOverrides,
  enabledFeatures,
} from "@/constants/common/chart";

//chart customization to display
import { useChartDataStore } from "@/store/useChartData";
import { useShallow } from "zustand/shallow";

// Theme detection utility
const getTheme = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("theme") || "dark";
  }
  return "dark";
};

const TradingViewAdvancedChart = React.memo(
  ({ chainId, symbol, address, pairAddress, quoteToken, createdAt }) => {
    const { ordersOnChart, indicatorOnChart } = useChartDataStore(
      useShallow((state) => ({
        ordersOnChart: state.ordersOnChart,
        indicatorOnChart: state.indicatorOnChart,
      }))
    );
    const [chartReady, setChartReady] = useState(false);
    const chartContainerRef = useRef(null);
    const tvWidgetRef = useRef(null);
    const linesRef = useRef([]);
    const caseEntity = useRef(null);

    const drawLineOnChart = useCallback(() => {
      if (
        chartReady == true &&
          tvWidgetRef.current != undefined &&
        ordersOnChart &&
        ordersOnChart.length > 0
      ) {
        const chart = tvWidgetRef.current.activeChart();
        // Clear previous lines before drawing new ones
        linesRef.current.forEach((line) => line.remove && line.remove());
        linesRef.current = [];

        for (let i = 0; i < ordersOnChart.length; i++) {
          if (
            ordersOnChart[i].orderStatus === "Opened" &&
            ordersOnChart[i].orderType === "long"
          ) {
            // TP Line
            const tpLine = chart
              .createPositionLine({ disableUndo: true })
              .setText(`${ordersOnChart[i].name}_TP`)
              .setPrice(
                formatUnits(
                  BigInt(ordersOnChart[i].takeProfit.takeProfitPrice || 0),
                  PRECISION_DECIMALS
                )
              )
              .setQuantity("")
              .setLineStyle(1)
              .setLineLength(1)
              .setBodyFont(`normal 12pt "Hanken Grotesk", sans-serif`)
              .setBodyTextColor("#fff")
              .setLineColor("#278404")
              .setBodyBackgroundColor("#278404")
              .setBodyBorderColor("#60f000");
            linesRef.current.push(tpLine);

            // SL Line
            const slLine = chart
              .createPositionLine({ disableUndo: true })
              .setText(`${ordersOnChart[i].name}_SL`)
              .setPrice(
                formatUnits(
                  BigInt(ordersOnChart[i].stopLoss.stopLossPrice || 0),
                  PRECISION_DECIMALS
                )
              )
              .setQuantity("")
              .setLineStyle(1)
              .setLineLength(1)
              .setBodyFont(`normal 12pt "Hanken Grotesk", sans-serif`)
              .setBodyTextColor("#fff")
              .setLineColor("#e3090d")
              .setBodyBackgroundColor("#e3090d")
              .setBodyBorderColor("#e3090d");
            linesRef.current.push(slLine);
          }
          if (
            ordersOnChart[i].orderStatus === "Pending" &&
            ordersOnChart[i].orderType === "short"
          ) {
            const entryLine = chart
              .createPositionLine({ disableUndo: true })
              .setText(`${ordersOnChart[i].name}_Entry`)
              .setPrice(
                formatUnits(
                  BigInt(ordersOnChart[i].target.shortTarget || 0),
                  PRECISION_DECIMALS
                )
              )
              .setQuantity("")
              .setLineStyle(1)
              .setLineLength(1)
              .setBodyFont(`normal 12pt "Hanken Grotesk", sans-serif`)
              .setBodyTextColor("#000")
              .setLineColor("#e0d5d5")
              .setBodyBackgroundColor("#e0d5d5")
              .setBodyBorderColor("#e0d5d5");
            linesRef.current.push(entryLine);
          }
        }
      }
    }, [chartReady, ordersOnChart]);

    // add indicator study on chart
    const addCaseStudy = useCallback(() => {
      if (
        chartReady == true &&
        tvWidgetRef.current != undefined &&
        indicatorOnChart &&
        indicatorOnChart?.indicatorName != undefined &&
        indicatorOnChart?.period != undefined &&
        indicatorOnChart?.resolution != undefined
      ) {
        const chart = tvWidgetRef.current.activeChart();
        if (caseEntity.current) {
          chart.removeEntity(caseEntity.current);
          caseEntity.current = null;
        }

        // Programmatically add an indicator
        // Syntax: createStudy(name, forceOverlay, lock, inputs, overrides, options)
        caseEntity.current = chart.createStudy(
          indicatorOnChart?.indicatorName,
          false,
          false,
          [indicatorOnChart?.period]
        );
      }
    }, [chartReady, indicatorOnChart]);

    useEffect(() => {
      if (
        chartReady == true &&
        indicatorOnChart &&
        indicatorOnChart?.indicatorName != undefined
      ) {
        addCaseStudy();
      }
      return () => {
        if (caseEntity.current) {
          chart.removeEntity(caseEntity.current);
          caseEntity.current = null;
        }
      };
    }, [chartReady, indicatorOnChart, addCaseStudy]);

    useEffect(() => {
      if (chartReady == true && ordersOnChart && ordersOnChart?.length > 0) {
        drawLineOnChart();
      }
      return () => {
        // Remove all lines on cleanup
        linesRef.current.forEach((line) => line.remove && line.remove());
        linesRef.current = [];
      };
    }, [chartReady /*ordersOnChart, drawLineOnChart*/]);

    // Initialize chart with current theme
    useEffect(() => {
      const script = document.createElement("script");
      script.src = "/charting_library/charting_library.js";
      script.async = true;

      script.onload = () => {
        if (window.TradingView && chartContainerRef.current) {
          let dataFeed = new DataFeed(
            chainId,
            address,
            pairAddress,
            quoteToken,
            createdAt
          );
          const currentTheme = getTheme();
          const dynamicOverrides = getDynamicChartOverrides(currentTheme);

          tvWidgetRef.current = new window.TradingView.widget({
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
            studies: [],
            disabled_features: ["header_symbol_search", "header_compare"],
            custom_css_url: "/tradingview-chart.css",
            enabled_features: enabledFeatures,
          });

          tvWidgetRef.current.onChartReady(() => {
            tvWidgetRef.current.chart();
            setChartReady(true);
            tvWidgetRef.current?.activeChart().dataReady();
          });
        } else {
          console.error(
            "TradingView is not available or chartContainerRef is null"
          );
        }
      };

      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }, [symbol, chainId]);

    // Listen for theme changes
    useEffect(() => {
      // Function to handle theme changes
      const handleThemeChange = () => {
        if (tvWidgetRef.current && chartReady) {
          const newTheme = getTheme();
          // Update chart theme
          tvWidgetRef.current.changeTheme(newTheme);

          // Update chart overrides for the new theme
          const dynamicOverrides = getDynamicChartOverrides(newTheme);
          const chart = tvWidgetRef.current.activeChart();
          chart.applyOverrides(dynamicOverrides);
        }
      };

      // Create a MutationObserver to watch for class changes on the html element
      // This will detect when the theme class changes between 'dark' and 'light'
      if (typeof window !== "undefined") {
        const htmlElement = document.documentElement;
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === "class") {
              handleThemeChange();
            }
          });
        });

        observer.observe(htmlElement, { attributes: true });

        // Clean up observer on component unmount
        return () => observer.disconnect();
      }
    }, [chartReady]);

    return (
      <div
        id="tradingview_advanced_chart"
        ref={chartContainerRef}
        style={{ height: "100%", width: "100%", borderRadius: "10px" }}
      />
    );
  }
);

export default TradingViewAdvancedChart;
