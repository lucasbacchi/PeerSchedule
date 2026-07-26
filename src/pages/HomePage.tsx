function Calendar() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Calendar 1">
            <div className="bg-[#f9fafb] col-1 h-[396px] ml-0 mt-0 relative rounded-[5px] row-1 w-[390px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[23px] leading-[1.2] ml-[28.5px] mt-[186.5px] not-italic relative row-1 text-[#64748b] text-[20px] w-[335px]">IFrame of Calendar Here</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[24px] leading-[1.2] ml-[28.23px] mt-[34.5px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[130px]">Calendar 1</p>
        </div>
    );
}

function Calendar1() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Calendar 2">
            <div className="bg-[#f9fafb] col-1 h-[395px] ml-0 mt-0 relative rounded-[5px] row-1 w-[390px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[23px] leading-[1.2] ml-[27.5px] mt-[186px] not-italic relative row-1 text-[#64748b] text-[20px] w-[335px]">IFrame of Calendar Here</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[110.233px] leading-[1.2] ml-[27.73px] mt-[34px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[130px]">Calendar 2</p>
        </div>
    );
}

function Calendar2() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Calendar 3">
            <div className="bg-[#f9fafb] col-1 h-[395px] ml-0 mt-0 relative rounded-[5px] row-1 w-[390px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[23px] leading-[1.2] ml-[27.5px] mt-[186px] not-italic relative row-1 text-[#64748b] text-[20px] w-[335px]">IFrame of Calendar Here</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal h-[110.233px] leading-[1.2] ml-[27.73px] mt-[34px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[130px]">Calendar 3</p>
        </div>
    );
}

function Events() {
    return (
        <div className="-translate-y-1/2 absolute content-stretch flex gap-[24px] h-[477px] items-center justify-center leading-[0] left-0 top-[calc(50%+9.5px)] w-[1305px]" data-name="Events">
            <Calendar />
            <Calendar1 />
            <Calendar2 />
        </div>
    );
}

function CalendarQuickLinks() {
    return (
        <div className="absolute h-[570px] left-0 overflow-clip top-[280px] w-[1310px]" data-name="Calendar Quick Links">
            <div className="absolute bg-white h-[565px] left-0 rounded-[25px] shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] border border-[#e2e8f0] top-0 w-[1305px]" />
            <Events />
            <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] left-[32px] not-italic text-[#0f172a] text-[24px] top-[21px] tracking-[-0.48px] whitespace-nowrap">Calendar Quick Links</p>
        </div>
    );
}

function Event() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Event 1">
            <div className="bg-[#f9fafb] col-1 h-[86px] ml-0 mt-0 relative rounded-[5px] row-1 w-[225px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[43.5px] not-italic relative row-1 text-[#64748b] text-[20px] w-[193px]">Date Time Location</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[8px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[75px]">Event 1</p>
        </div>
    );
}

function Event1() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Event 2">
            <div className="bg-[#f9fafb] col-1 h-[86px] ml-0 mt-0 relative rounded-[5px] row-1 w-[225px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[43.5px] not-italic relative row-1 text-[#64748b] text-[20px] w-[193px]">Date Time Location</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[7.5px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[75px]">Event 2</p>
        </div>
    );
}

function Event2() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Event 3">
            <div className="bg-[#f9fafb] col-1 h-[86px] ml-0 mt-0 relative rounded-[5px] row-1 w-[225px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[43.5px] not-italic relative row-1 text-[#64748b] text-[20px] w-[193px]">Date Time Location</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[8px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[75px]">Event 3</p>
        </div>
    );
}

function Event3() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Event 4">
            <div className="bg-[#f9fafb] col-1 h-[86px] ml-0 mt-0 relative rounded-[5px] row-1 w-[225px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[43.5px] not-italic relative row-1 text-[#64748b] text-[20px] w-[193px]">Date Time Location</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[8px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[75px]">Event 4</p>
        </div>
    );
}

function Event4() {
    return (
        <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0" data-name="Event 5">
            <div className="bg-[#f9fafb] col-1 h-[86px] ml-0 mt-0 relative rounded-[5px] row-1 w-[225px]">
                <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-[-1px] pointer-events-none rounded-[6px]" />
            </div>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[43.5px] not-italic relative row-1 text-[#64748b] text-[20px] w-[193px]">Date Time Location</p>
            <p className="[word-break:break-word] col-1 font-['Inter:Regular',sans-serif] font-normal leading-[1.2] ml-[16px] mt-[8px] not-italic relative row-1 text-[#0f172a] text-[20px] w-[75px]">Event 5</p>
        </div>
    );
}

function Events1() {
    return (
        <div className="absolute content-stretch flex gap-[24px] h-[86px] items-center justify-center leading-[0] left-0 top-[81px] w-[1305px]" data-name="Events">
            <Event />
            <Event1 />
            <Event2 />
            <Event3 />
            <Event4 />
        </div>
    );
}

function UpcomingEvents() {
    return (
        <div className="absolute h-[235px] left-0 " data-name="Upcoming Events">
            <div className="absolute bg-white h-[230px] left-0 rounded-[25px] shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] border border-[#e2e8f0] top-0 w-[1305px]" />
            <Events1 />
            <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] left-[32px] not-italic text-[#0f172a] text-[24px] top-[21px] tracking-[-0.48px] whitespace-nowrap">Upcoming Events</p>
        </div>
    );
}

function Title() {
    return (
        <div data-name="Title">
            <h1 className="text-[32px] font-bold text-[#0f172a] tracking-tight mb-5">Dashboard</h1>
        </div>
    );
}

export default function MainPage() {
    const calendars = scheduleStore.calendars();
    const events = scheduleStore.events()
        .filter((event) => new Date(`${event.date}T${event.start}`) >= new Date())
        .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
        .slice(0, 5);
    return (
        <div className="bg-[#F8FAFC] flex flex-col font-['Inter',sans-serif]" data-name="Main Page">
            <main className="flex-1 px-10 pt-6 pb-8">
                <Title />
                <div className="relative h-[885px]">
                    <CalendarQuickLinks />
                    <UpcomingEvents />
                </div>
            </main>
            <title>Home | PeerSchedule</title>
        </div>
    );
}
