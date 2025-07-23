#!/usr/bin/env node

/**
 * Local test of condition checking logic
 */

// Simulate the condition check logic from MonitoringService.ts

function cellRefToIndices(cellRef) {
    const match = cellRef.match(/([A-Z]+)(\d+)/);
    if (!match) {
        throw new Error(`Invalid cell reference: ${cellRef}`);
    }
    
    const colStr = match[1];
    const rowStr = match[2];
    
    // Convert column letters to index (A=0, B=1, ..., Z=25, AA=26, etc.)
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    col -= 1; // Convert to 0-based index
    
    const row = parseInt(rowStr) - 1; // Convert to 0-based index
    
    return { row, col };
}

function parseCellRange(cellRange, maxRows, maxCols) {
    // Remove sheet name if present (e.g., "Sheet1!A1:C3" -> "A1:C3")
    const range = cellRange.includes('!') ? cellRange.split('!')[1] : cellRange;
    
    console.log(`🔍 Parsing range: "${range}"`);
    
    if (range.includes(':')) {
        const [start, end] = range.split(':');
        console.log(`🔍 Start: "${start}", End: "${end}"`);
        
        const startPos = cellRefToIndices(start);
        const endPos = cellRefToIndices(end);
        
        console.log(`🔍 Start pos:`, startPos);
        console.log(`🔍 End pos:`, endPos);
        console.log(`🔍 Max rows/cols: ${maxRows}, ${maxCols}`);
        
        const result = {
            startRow: startPos.row,
            endRow: Math.min(endPos.row, maxRows - 1),
            startCol: startPos.col,
            endCol: Math.min(endPos.col, maxCols - 1)
        };
        
        console.log(`🔍 Parsed result:`, result);
        return result;
    } else {
        // Single cell
        const pos = cellRefToIndices(range);
        return {
            startRow: pos.row,
            endRow: pos.row,
            startCol: pos.col,
            endCol: pos.col
        };
    }
}

function checkLegacyCondition(condition, oldValue, newValue) {
    console.log(`🔍 Legacy condition check: type=${condition.type}, oldValue=${oldValue}, newValue=${newValue}, threshold=${condition.threshold}, value=${condition.value}`);
    
    switch (condition.type) {
        case 'changed':
            const changedResult = oldValue !== newValue;
            console.log(`📋 Changed result: ${changedResult}`);
            return changedResult;
        case 'greater_than':
            const numValueGt = parseFloat(String(newValue));
            const thresholdGt = condition.threshold;
            const gtResult = !isNaN(numValueGt) && thresholdGt !== undefined && numValueGt > thresholdGt;
            console.log(`📊 Greater than check: ${numValueGt} > ${thresholdGt} = ${gtResult} (isNaN: ${isNaN(numValueGt)}, threshold defined: ${thresholdGt !== undefined})`);
            return gtResult;
        case 'less_than':
            const numValueLt = parseFloat(String(newValue));
            const thresholdLt = condition.threshold;
            const ltResult = !isNaN(numValueLt) && thresholdLt !== undefined && numValueLt < thresholdLt;
            console.log(`📊 Less than check: ${numValueLt} < ${thresholdLt} = ${ltResult}`);
            return ltResult;
        case 'equals':
            const equalsResult = String(newValue) === String(condition.value);
            console.log(`📊 Equals check: "${String(newValue)}" === "${String(condition.value)}" = ${equalsResult}`);
            return equalsResult;
        case 'not_equals':
            const notEqualsResult = String(newValue) !== String(condition.value);
            console.log(`📊 Not equals check: "${String(newValue)}" !== "${String(condition.value)}" = ${notEqualsResult}`);
            return notEqualsResult;
        case 'contains':
            const containsResult = condition.value && String(newValue).includes(String(condition.value));
            console.log(`📊 Contains check: "${String(newValue)}".includes("${String(condition.value)}") = ${containsResult}`);
            return containsResult;
        default:
            console.log(`❌ Unknown condition type: ${condition.type}`);
            return false;
    }
}

function checkRangeCondition(condition, oldValues, newValues, monitoringRange) {
    if (!condition.cellRef) return false;
    
    console.log(`🔍 Range condition check: cellRef=${condition.cellRef}, condition=${JSON.stringify(condition)}`);
    
    try {
        const conditionRange = parseCellRange(condition.cellRef, newValues.length, newValues[0]?.length || 0);
        console.log(`📍 Condition range: startRow=${conditionRange.startRow}, endRow=${conditionRange.endRow}, startCol=${conditionRange.startCol}, endCol=${conditionRange.endCol}`);
        
        // Check each cell in the condition range
        for (let row = conditionRange.startRow; row <= conditionRange.endRow; row++) {
            for (let col = conditionRange.startCol; col <= conditionRange.endCol; col++) {
                if (row < newValues.length && col < (newValues[row]?.length || 0)) {
                    const cellValue = newValues[row][col];
                    const oldCellValue = oldValues[row] && oldValues[row][col];
                    
                    console.log(`🔍 Checking cell at row ${row + 1}, col ${col + 1}: old=${oldCellValue}, new=${cellValue}`);
                    
                    if (checkLegacyCondition(condition, oldCellValue, cellValue)) {
                        console.log(`🎯 Range condition met: ${condition.cellRef} at row ${row + 1}, col ${col + 1} = ${cellValue}`);
                        return true;
                    }
                } else {
                    console.log(`⚠️ Cell out of bounds: row ${row + 1}, col ${col + 1}`);
                }
            }
        }
    } catch (error) {
        console.error('Error checking range condition:', error);
    }
    
    return false;
}

function testConditionChecking() {
    console.log('🧪 Testing condition checking logic...\n');
    
    // Simulate the data from Railway logs
    const condition = {
        "type": "greater_than",
        "value": "1",
        "threshold": 1,
        "enabled": true,
        "cellRef": "E1:E20"
    };
    
    // Create test data where E10 (col 4, row 9) changes from '' to 80000
    const oldValues = [
        ["", 100000, 60000],
        ["", 1000000000],
        [],
        ["", 7777777],
        [69],
        [],
        [],
        [],
        ["", 8000],
        [], // Row 9 (E10 is row 9, col 4 in 0-based indexing)
        [],
        [],
        [],
        [],
        [],
        [],
        ["", 600],
        ["", 700, "", "", 8000]
    ];
    
    const newValues = [
        ["", 100000, 60000],
        ["", 1000000000],
        [],
        ["", 7777777],
        [69],
        [],
        [],
        [],
        ["", 8000],
        ["", "", "", "", 80000], // Row 9 (E10) now has 80000 at index 4
        [],
        [],
        [],
        [],
        [],
        [],
        ["", 600],
        ["", 700, "", "", 8000]
    ];
    
    console.log('📊 Test data:');
    console.log('Old E10 (row 9, col 4):', oldValues[9] ? oldValues[9][4] : 'undefined');
    console.log('New E10 (row 9, col 4):', newValues[9] ? newValues[9][4] : 'undefined');
    console.log('Condition:', JSON.stringify(condition, null, 2));
    console.log('');
    
    // Test the range condition
    const result = checkRangeCondition(condition, oldValues, newValues, 'E1:E20');
    
    console.log(`\n🎯 Final result: ${result}`);
    
    if (!result) {
        console.log('\n🔍 Let\'s check why this failed...');
        
        // Check if E10 position is calculated correctly
        const e10Pos = cellRefToIndices('E10');
        console.log('E10 position:', e10Pos);
        
        // Check if the range includes E10
        const range = parseCellRange('E1:E20', newValues.length, 20);
        console.log('Range E1:E20:', range);
        
        const isE10InRange = e10Pos.row >= range.startRow && e10Pos.row <= range.endRow && 
                            e10Pos.col >= range.startCol && e10Pos.col <= range.endCol;
        console.log('Is E10 in range E1:E20?', isE10InRange);
        
        // Check the specific cell
        if (e10Pos.row < newValues.length && e10Pos.col < (newValues[e10Pos.row]?.length || 0)) {
            const cellValue = newValues[e10Pos.row][e10Pos.col];
            const oldCellValue = oldValues[e10Pos.row] && oldValues[e10Pos.row][e10Pos.col];
            console.log(`E10 values: old=${oldCellValue}, new=${cellValue}`);
            
            const legacyResult = checkLegacyCondition(condition, oldCellValue, cellValue);
            console.log(`Legacy condition result for E10: ${legacyResult}`);
        } else {
            console.log('E10 is out of bounds in the data');
        }
    }
}

testConditionChecking();
