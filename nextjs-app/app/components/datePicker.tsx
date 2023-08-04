const DateRangeOptions = {
    "this_year": "This year",
    "last_year": "Last year",
    "last_3": "Last 3 months",
    "last_24": "Last 2 years",
    "last_60": "Last 5 years",
}

export type DateRangeOption = keyof typeof DateRangeOptions;

export function DatePicker ({
    value,
    onChange,
    id,
    className
}: {
    value: DateRangeOption,
    onChange: (v: DateRangeOption) => void,
    id?: string,
    className?: string
}) {
    return (
        <select
            name="dateRange"
            id={id}
            className={className}
            value={value}
            onChange={e => onChange(e.target.value as DateRangeOption)}
        >
            {
                (Object.keys(DateRangeOptions) as Array<DateRangeOption>).map(key =>
                    <option key={key} value={key}>
                        {DateRangeOptions[key]}
                    </option>
                )
            }
        </select>
    );
}
