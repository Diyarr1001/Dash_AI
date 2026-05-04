from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.database import db_manager
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

router = APIRouter()

class ForecastRequest(BaseModel):
    table_name: str
    time_column: str
    value_column: str
    periods: int = 6
    filters: Optional[Dict[str, Any]] = None

@router.post("/forecast")
async def generate_forecast(request: ForecastRequest):
    try:
        # 1. Build filtered query
        where_clauses = []
        if request.filters:
            if request.filters.get('year'):
                where_clauses.append(f"EXTRACT(YEAR FROM \"{request.time_column}\") = {request.filters['year']}")
            if request.filters.get('month'):
                where_clauses.append(f"EXTRACT(MONTH FROM \"{request.time_column}\") = {request.filters['month']}")
            if request.filters.get('day'):
                where_clauses.append(f"EXTRACT(DAY FROM \"{request.time_column}\") = {request.filters['day']}")
        
        where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query = f"SELECT \"{request.time_column}\", \"{request.value_column}\" FROM {request.table_name} {where_str} ORDER BY \"{request.time_column}\""
        
        df = db_manager.get_df_from_duck(query)
        if df.empty:
            return {"historical": [], "forecast": [], "trend_slope": 0, "message": "No data found for selected filters"}
        
        # 2. Simple Linear Trend Forecasting (as a baseline)
        # Convert time to numeric for regression
        df['time_idx'] = np.arange(len(df))
        y = df[request.value_column].values
        x = df['time_idx'].values
        
        # Calculate slope and intercept
        slope, intercept = np.polyfit(x, y, 1)
        
        # 3. Generate future periods
        last_idx = x[-1]
        future_x = np.arange(last_idx + 1, last_idx + 1 + request.periods)
        future_y = slope * future_x + intercept
        
        # Construct result
        historical = df.to_dict(orient="records")
        forecast = []
        for i, val in enumerate(future_y):
            forecast.append({
                "period": i + 1,
                request.value_column: float(val),
                "is_forecast": True
            })
            
        return {
            "historical": historical,
            "forecast": forecast,
            "trend_slope": float(slope)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
