class ClockNodes extends LGraphNode {
    constructor() {
        super();
        this.size = [240, 190];
        
        // Default properties (24-hour format)
        this.properties = {
            year: 2025,
            month: 1,   // 1–12
            day: 1,     // 1–31 (user picks actual day)
            hour: 12,   // 0–23
            minute: 0,  // 0–59
            second: 0   // 0–59
        };
        
        this.title = "Clock Cron";
        this.desc = "Triggers event at selected date/time";
        
        // Output event
        this.addOutput("On Time", LiteGraph.EVENT);

        this._alreadyTriggered = false;
        
        // YEAR combo
        // You can change the range to whatever you need
        const yearOptions = [];
        for(let y = 2023; y <= 2030; y++){
            yearOptions.push(y);
        }
        this.addWidget("combo", "Year", this.properties.year, (val) => {
            this.properties.year = val;
            this._alreadyTriggered = false;
        }, { values: yearOptions });
        
        // MONTH combo
        // 1–12
        const monthOptions = Array.from({length:12}, (_,i) => i+1); 
        this.addWidget("combo", "Month", this.properties.month, (val) => {
            this.properties.month = val;
            this._alreadyTriggered = false;
        }, { values: monthOptions });
        
        // DAY combo
        // 1–31 (technically we should adjust for each month’s days, 
        // but for simplicity, we just do 1–31)
        const dayOptions = Array.from({length:31}, (_,i) => i+1);
        this.addWidget("combo", "Day", this.properties.day, (val) => {
            this.properties.day = val;
            this._alreadyTriggered = false;
        }, { values: dayOptions });
        
        // HOUR combo (24-hour)
        // 0–23
        const hourOptions = Array.from({length:24}, (_,i) => i);
        this.addWidget("combo", "Hour (24h)", this.properties.hour, (val) => {
            this.properties.hour = val;
            this._alreadyTriggered = false;
        }, { values: hourOptions });
        
        // MINUTE combo
        // 0–59
        const minuteOptions = Array.from({length:60}, (_,i) => i);
        this.addWidget("combo", "Minute", this.properties.minute, (val) => {
            this.properties.minute = val;
            this._alreadyTriggered = false;
        }, { values: minuteOptions });

        // SECOND combo
        // 0–59
        const secondOptions = Array.from({length:60}, (_,i) => i);
        this.addWidget("combo", "Second", this.properties.second, (val) => {
            this.properties.second = val;
            this._alreadyTriggered = false;
        }, { values: secondOptions });

        // Reset button
        this.addWidget("button", "Reset Trigger", null, () => {
            this._alreadyTriggered = false;
        });
    }

    onExecute() {
        if(this._alreadyTriggered) {
            return;
        }

        // Construct the target Date
        const {
            year, month, day,
            hour, minute, second
        } = this.properties;
        
        // JavaScript's Date constructor:
        // new Date(year, monthIndex, day, hours, minutes, seconds)
        // Note: month is zero-based, so we do (month - 1)
        const targetDate = new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            second
        );

        // If invalid date, bail out
        if(isNaN(targetDate.getTime())) {
            return;
        }
        
        const now = new Date();
        if(now >= targetDate) {
            // Trigger event
            this.triggerSlot(0);
            this._alreadyTriggered = true;
        }
    }

    getTitle() {
        // Show a compact summary if collapsed
        if(this.flags.collapsed){
            const p = this.properties;
            return `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")} ${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")}:${String(p.second).padStart(2,"0")}`;
        }
        return this.title;
    }

    onDrawBackground(ctx) {
        // Show the current target date/time
        ctx.fillStyle = "#AAA";
        ctx.font = "12px Arial";
        ctx.fillText(
            `${this.properties.year}-${String(this.properties.month).padStart(2,"0")}-${String(this.properties.day).padStart(2,"0")} ` +
            `${String(this.properties.hour).padStart(2,"0")}:${String(this.properties.minute).padStart(2,"0")}:${String(this.properties.second).padStart(2,"0")}`,
            10, this.size[1] * 0.5
        );
    }
}

LiteGraph.registerNodeType("tango/clock", ClockNodes);