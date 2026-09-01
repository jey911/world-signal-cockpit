# Initial indicator universe

Total: **113 sensors**.

The active set is deliberately curated for event sensitivity and control coverage.

## global-equity · 19

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `^GSPC` | S&P 500 | US | control | 1 |
| `^IXIC` | Nasdaq Composite | US | confirming | 1 |
| `^DJI` | Dow Jones Industrial Average | US | confirming | 2 |
| `^RUT` | Russell 2000 | US | leading | 1 |
| `^VIX` | VIX | US | leading | 1 |
| `^VIX3M` | VIX 3-Month | US | leading | 2 |
| `^STOXX50E` | Euro Stoxx 50 | Europe | confirming | 1 |
| `^FTSE` | FTSE 100 | UK | confirming | 2 |
| `^GDAXI` | DAX | Germany | confirming | 1 |
| `^N225` | Nikkei 225 | Japan | confirming | 1 |
| `^HSI` | Hang Seng | Hong Kong | leading | 1 |
| `000001.SS` | Shanghai Composite | China | confirming | 1 |
| `^NSEI` | Nifty 50 | India | confirming | 2 |
| `^KS11` | KOSPI | South Korea | leading | 1 |
| `^TWII` | Taiwan Weighted | Taiwan | leading | 1 |
| `^AXJO` | ASX 200 | Australia | confirming | 2 |
| `^BVSP` | Bovespa | Brazil | confirming | 2 |
| `FEZ` | Euro Stoxx 50 ETF | Europe | confirming | 2 |
| `EEM` | Emerging Markets ETF | Emerging Markets | leading | 1 |

## country-region · 26

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `EIS` | Israel ETF | Israel | leading | 1 |
| `KSA` | Saudi Arabia ETF | Saudi Arabia | leading | 1 |
| `UAE` | UAE ETF | UAE | confirming | 1 |
| `QAT` | Qatar ETF | Qatar | confirming | 2 |
| `TUR` | Turkey ETF | Turkey | leading | 1 |
| `EZA` | South Africa ETF | South Africa | leading | 2 |
| `EGPT` | Egypt ETF | Egypt | leading | 1 |
| `EWZ` | Brazil ETF | Brazil | leading | 2 |
| `EWW` | Mexico ETF | Mexico | confirming | 2 |
| `EWC` | Canada ETF | Canada | confirming | 2 |
| `EWG` | Germany ETF | Germany | confirming | 1 |
| `EWU` | United Kingdom ETF | UK | confirming | 2 |
| `EWQ` | France ETF | France | confirming | 2 |
| `EWI` | Italy ETF | Italy | leading | 2 |
| `EWP` | Spain ETF | Spain | confirming | 2 |
| `EWL` | Switzerland ETF | Switzerland | confirming | 2 |
| `EWN` | Netherlands ETF | Netherlands | confirming | 3 |
| `EPOL` | Poland ETF | Poland | leading | 1 |
| `INDA` | India ETF | India | confirming | 2 |
| `FXI` | China Large-Cap ETF | China | leading | 1 |
| `MCHI` | China ETF | China | leading | 1 |
| `EWT` | Taiwan ETF | Taiwan | leading | 1 |
| `EWY` | South Korea ETF | South Korea | leading | 1 |
| `EWA` | Australia ETF | Australia | confirming | 2 |
| `EIDO` | Indonesia ETF | Indonesia | confirming | 2 |
| `VNM` | Vietnam ETF | Vietnam | leading | 2 |

## fx · 18

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `DX-Y.NYB` | US Dollar Index | Global | control | 1 |
| `EURUSD=X` | EUR/USD | Europe | leading | 1 |
| `GBPUSD=X` | GBP/USD | UK | confirming | 2 |
| `JPY=X` | USD/JPY | Japan | leading | 1 |
| `CHF=X` | USD/CHF | Switzerland | leading | 2 |
| `CAD=X` | USD/CAD | Canada | confirming | 2 |
| `CNY=X` | USD/CNY | China | leading | 1 |
| `HKD=X` | USD/HKD | Hong Kong | leading | 1 |
| `KRW=X` | USD/KRW | South Korea | leading | 1 |
| `INR=X` | USD/INR | India | confirming | 2 |
| `TRY=X` | USD/TRY | Turkey | leading | 1 |
| `ILS=X` | USD/ILS | Israel | leading | 1 |
| `ZAR=X` | USD/ZAR | South Africa | leading | 2 |
| `BRL=X` | USD/BRL | Brazil | leading | 2 |
| `MXN=X` | USD/MXN | Mexico | confirming | 2 |
| `AUDUSD=X` | AUD/USD | Australia | leading | 2 |
| `NZDUSD=X` | NZD/USD | New Zealand | confirming | 3 |
| `SGD=X` | USD/SGD | Singapore | confirming | 2 |

## rates-credit · 12

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `^IRX` | 13-Week T-Bill Yield | US | control | 1 |
| `^FVX` | 5-Year Treasury Yield | US | control | 2 |
| `^TNX` | 10-Year Treasury Yield | US | control | 1 |
| `^TYX` | 30-Year Treasury Yield | US | control | 2 |
| `TLT` | 20+ Year Treasury ETF | US | leading | 1 |
| `IEF` | 7-10 Year Treasury ETF | US | control | 2 |
| `SHY` | 1-3 Year Treasury ETF | US | control | 3 |
| `TIP` | TIPS ETF | US | confirming | 2 |
| `HYG` | High Yield Credit ETF | US | leading | 1 |
| `LQD` | Investment Grade Credit ETF | US | confirming | 1 |
| `EMB` | Emerging Market Bonds ETF | Emerging Markets | leading | 1 |
| `BNDX` | International Bonds ETF | Global | confirming | 2 |

## energy · 9

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `CL=F` | WTI Crude Oil | Global | leading | 1 |
| `BZ=F` | Brent Crude Oil | Global | leading | 1 |
| `NG=F` | Natural Gas | Global | leading | 1 |
| `RB=F` | RBOB Gasoline | US | leading | 2 |
| `HO=F` | Heating Oil | US | leading | 2 |
| `XLE` | Energy Sector ETF | US | confirming | 1 |
| `XOP` | Oil & Gas E&P ETF | US | confirming | 2 |
| `OIH` | Oil Services ETF | Global | confirming | 2 |
| `LNG` | Cheniere Energy | US | leading | 2 |

## metals-agriculture · 10

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `GC=F` | Gold | Global | leading | 1 |
| `SI=F` | Silver | Global | confirming | 2 |
| `HG=F` | Copper | Global | leading | 1 |
| `PL=F` | Platinum | Global | confirming | 3 |
| `PA=F` | Palladium | Global | leading | 2 |
| `ZC=F` | Corn | Global | leading | 2 |
| `ZW=F` | Wheat | Global | leading | 1 |
| `ZS=F` | Soybeans | Global | confirming | 2 |
| `DBA` | Agriculture Basket ETF | Global | confirming | 2 |
| `URA` | Uranium ETF | Global | leading | 2 |

## strategic-sector · 13

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `ITA` | US Aerospace & Defense ETF | US | leading | 1 |
| `XAR` | Aerospace & Defense ETF | US | leading | 1 |
| `SMH` | Semiconductor ETF | Global | leading | 1 |
| `SOXX` | Semiconductor ETF | Global | confirming | 1 |
| `JETS` | Airlines ETF | Global | leading | 1 |
| `IYT` | Transportation ETF | US | confirming | 1 |
| `BDRY` | Dry Bulk Shipping ETF | Global | leading | 1 |
| `BOAT` | Global Shipping ETF | Global | confirming | 2 |
| `KRE` | Regional Banks ETF | US | leading | 1 |
| `KBE` | Banks ETF | US | confirming | 1 |
| `EUFN` | Europe Financials ETF | Europe | leading | 1 |
| `CIBR` | Cybersecurity ETF | Global | confirming | 2 |
| `XLI` | Industrials ETF | US | confirming | 2 |

## safe-haven · 4

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `GLD` | Gold ETF | Global | leading | 1 |
| `UUP` | US Dollar ETF | Global | control | 2 |
| `FXY` | Japanese Yen ETF | Japan | confirming | 2 |
| `FXF` | Swiss Franc ETF | Switzerland | confirming | 2 |

## crypto · 2

| Symbol | Name | Region | Role | Priority |
|---|---|---|---|---:|
| `BTC-USD` | Bitcoin | Global | leading | 2 |
| `ETH-USD` | Ethereum | Global | confirming | 3 |
