"use client"

import { useEffect, useState } from "react";
import { Tab } from "@headlessui/react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";

export default function Dashboard() {
  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [upcomingWeeks, setUpcomingWeeks] = useState<any[]>([]);
  const [pastWeeks, setPastWeeks] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: userTrackProgress, error } = await supabase
        .from("user_track_progress")
        .select("*")
        .order("week", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching user track progress:", error);
        return;
      }

      if (userTrackProgress && userTrackProgress.length > 0) {
        const latestWeek = userTrackProgress[0];
        setCurrentWeek(latestWeek);

        // Fetch upcoming and past weeks based on the latest week
        const { data: allWeeks, error: weeksError } = await supabase
          .from("weeks")
          .select("*")
          .order("week", { ascending: true });

        if (weeksError) {
          console.error("Error fetching weeks:", weeksError);
          return;
        }

        if (allWeeks) {
          const upcoming = allWeeks.filter((week) => week.week > latestWeek.week);
          const past = allWeeks.filter((week) => week.week < latestWeek.week);
          setUpcomingWeeks(upcoming);
          setPastWeeks(past);
        }
      }
    };

    fetchData();
  }, [supabase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-12">
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab className={({ selected }) => selected ? "bg-white shadow" : "text-blue-100 hover:bg-white/[0.12]"}>Current Week</Tab>
          <Tab className={({ selected }) => selected ? "bg-white shadow" : "text-blue-100 hover:bg-white/[0.12]"}>Upcoming Weeks</Tab>
          <Tab className={({ selected }) => selected ? "bg-white shadow" : "text-blue-100 hover:bg-white/[0.12]"}>Past Weeks</Tab>
        </Tab.List>
        <Tab.Panels className="mt-2">
          <Tab.Panel className="bg-white p-3 rounded-xl shadow">
            {currentWeek ? (
              <div>
                <h2 className="text-xl font-bold">Current Week: {currentWeek.week}</h2>
                <p>Tasks Completed: {currentWeek.tasks_completed}</p>
                <p>Current Task: {currentWeek.current_task}</p>
                <p>Deadline: {currentWeek.deadline}</p>
                <p>Future Tasks: {currentWeek.future_tasks}</p>
              </div>
            ) : (
              <p>Loading current week...</p>
            )}
          </Tab.Panel>
          <Tab.Panel className="bg-white p-3 rounded-xl shadow">
            {upcomingWeeks.length > 0 ? (
              upcomingWeeks.map((week) => (
                <div key={week.week}>
                  <h2 className="text-xl font-bold">Week: {week.week}</h2>
                  <p>Status: Not available until current week is completed</p>
                </div>
              ))
            ) : (
              <p>No upcoming weeks available.</p>
            )}
          </Tab.Panel>
          <Tab.Panel className="bg-white p-3 rounded-xl shadow">
            {pastWeeks.length > 0 ? (
              pastWeeks.map((week) => (
                <div key={week.week}>
                  <h2 className="text-xl font-bold">Week: {week.week}</h2>
                  <p>Details: {week.details}</p>
                </div>
              ))
            ) : (
              <p>No past weeks available.</p>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
